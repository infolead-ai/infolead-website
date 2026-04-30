import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { systemPrompt, type Lang } from '../../lib/chat-system-prompt';

export const prerender = false;

const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_MESSAGES = 20;
const RATE_LIMIT_PER_MIN = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TOKENS = 500;

type RateEntry = { count: number; resetAt: number };
// Stored on globalThis so the Map survives Vite SSR module re-evaluation in
// dev mode. In production (single warm Vercel function instance) this also
// works fine. Note: limit is per-instance, not shared across cold starts or
// multiple concurrent Vercel instances under load.
const rateLimitMap: Map<string, RateEntry> =
  ((globalThis as unknown) as { __infoleadRateLimit?: Map<string, RateEntry> })
    .__infoleadRateLimit ??
  (((globalThis as unknown) as { __infoleadRateLimit: Map<string, RateEntry> })
    .__infoleadRateLimit = new Map());

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_MIN) return false;
  entry.count += 1;
  return true;
}

function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Server-side last-line of defense: strip meta-commentary parentheticals
// and chain-of-thought self-audit patterns the model occasionally emits
// despite prompt rules. Operates on the trailing buffer of the streaming
// response (size bumped to 800 chars to give this function a wide-enough
// window to catch full draft-then-critique-then-rewrite CoT cycles).
function sanitizeMetaLeak(text: string): string {
  let out = text;

  // (1) FIRST — strip "Corrected response:" markers and the rephrased
  // duplicate that follows. Catches CoT self-audit cycles where the
  // model drafts → critiques → rewrites in one stream. Apply before
  // duplicate detection so the duplicate detector sees clean text.
  out = out.replace(/\*\*Corrected response[：:]?\*\*[\s\S]*?(?=\n\n|$)/gi, '');
  out = out.replace(/(?:^|\n)Corrected response[：:][\s\S]*?(?=\n\n|$)/gi, '');
  out = out.replace(/\*\*修正后的回复[：:]?\*\*[\s\S]*?(?=\n\n|$)/gi, '');
  out = out.replace(/(?:^|\n)修正后的回复[：:][\s\S]*?(?=\n\n|$)/gi, '');
  out = out.replace(/\*\*Updated[：:]?\*\*[\s\S]*?(?=\n\n|$)/gi, '');
  out = out.replace(/\*\*Revised[：:]?\*\*[\s\S]*?(?=\n\n|$)/gi, '');

  // (2) Strip italic asterisk-wrapped parentheticals — anywhere, mid
  // or trailing. Covers "*(Note: ...)*", "*(Per X rule, ...)*", which
  // are the most common CoT-leak signature. No anchor — strip anywhere.
  out = out.replace(/\s*\*+\([^)]{1,400}\)\*+\s*/g, ' ');

  // (3) Strip mid-response known meta-leak prefixes (capped to avoid
  // catching legitimate parenthetical clarifications mid-text).
  out = out.replace(/\s*\((?:Note|NOTE|FYI|Disclaimer|For compliance|For reference|For your reference|Alternatively)[^)]{1,200}\)\s*/gi, ' ');
  out = out.replace(/\s*（(?:注|严格遵循|仅供参考|另外|免责声明|注释)[^）]{1,200}）\s*/g, ' ');

  // (4) Trailing-only fallbacks (uncapped) for the long-form leaks v1
  // sometimes emitted at end of stream.
  out = out.replace(/\s*\((?:Note|NOTE|FYI|Disclaimer|For compliance|For reference|For your reference|Alternatively)[^)]*\)\s*$/gi, '');
  out = out.replace(/\s*（(?:注|严格遵循|仅供参考|另外|免责声明|注释)[^）]*）\s*$/g, '');

  // (5) Generic trailing parenthetical (any opener), capped at 400 chars
  // to avoid stripping legit parenthetical clarification at stream end.
  // Both ASCII and full-width styles.
  out = out.replace(/\s*\([^)]{1,400}\)\s*$/, '');
  out = out.replace(/\s*（[^）]{1,400}）\s*$/, '');

  // (6) Collapse whitespace artifacts left by stripping.
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

// 800-char tail buffer gives sanitizeMetaLeak() enough window to catch full
// draft→critique→rewrite CoT cycles (observed up to ~730 chars in iter-3
// QA). Trade-off: last ~2-4 seconds of streaming is held until stream end.
const SANITIZE_TAIL_BUFFER_CHARS = 800;

const apiKey = process.env.OPENROUTER_API_KEY ?? import.meta.env.OPENROUTER_API_KEY;

const client = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://infolead.ca',
        'X-Title': 'InfoLead Demo',
      },
    })
  : null;

export const POST: APIRoute = async ({ request }) => {
  if (!client) return jsonError('server_misconfigured', 500);

  const ip = getClientIp(request);
  if (Math.random() < 0.1) cleanupRateLimit();
  if (!checkRateLimit(ip)) return jsonError('rate_limited', 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 400);
  }

  const { messages, lang } = (body ?? {}) as {
    messages?: Array<{ role: string; content: string }>;
    lang?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('messages_required', 400);
  }
  if (messages.length > MAX_HISTORY_MESSAGES) {
    return jsonError('history_too_long', 400);
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || typeof last.content !== 'string') {
    return jsonError('invalid_message', 400);
  }
  if (last.content.trim().length === 0) {
    return jsonError('empty_message', 400);
  }
  if (last.content.length > MAX_MESSAGE_CHARS) {
    return jsonError('message_too_long', 400);
  }

  const language: Lang = lang === 'zh' ? 'zh' : 'en';

  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  let upstream;
  try {
    upstream = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt(language) }, ...cleaned],
      stream: true,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    });
  } catch {
    return jsonError('upstream_error', 502);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Hold the trailing N chars in a buffer so we can sanitize meta-leak
      // patterns at stream end. Everything older than the tail flushes in
      // real time to preserve the streaming UX.
      let tail = '';
      try {
        for await (const chunk of upstream) {
          const text = chunk.choices?.[0]?.delta?.content ?? '';
          if (!text) continue;
          tail += text;
          if (tail.length > SANITIZE_TAIL_BUFFER_CHARS) {
            const flushable = tail.slice(0, tail.length - SANITIZE_TAIL_BUFFER_CHARS);
            controller.enqueue(encoder.encode(flushable));
            tail = tail.slice(tail.length - SANITIZE_TAIL_BUFFER_CHARS);
          }
        }
        const cleaned = sanitizeMetaLeak(tail);
        if (cleaned) controller.enqueue(encoder.encode(cleaned));
      } catch {
        // upstream stream broke mid-flight; flush whatever's safe.
        const cleaned = sanitizeMetaLeak(tail);
        if (cleaned) controller.enqueue(encoder.encode(cleaned));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
