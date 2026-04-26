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
      try {
        for await (const chunk of upstream) {
          const text = chunk.choices?.[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch {
        // upstream stream broke mid-flight; close gracefully so the client
        // sees what was received so far rather than a hung connection.
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
