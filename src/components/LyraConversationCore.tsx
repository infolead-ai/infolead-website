import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { LYRA_COPY } from '../lib/lyra-copy';
import type { Lang, LyraMessage, LyraStatus } from '../types/lyra';
import type { InitialAction } from './LyraVoiceWidget';

export type LyraVariant = 'standalone' | 'stage';

interface Props {
  lang: Lang;
  agentId: string;
  initialAction: InitialAction;
  forceTextOnly: boolean;
  variant?: LyraVariant;
}

function scrubVendor(text: string): string {
  return text
    .replace(/eleven\s*labs?/gi, 'InfoLead AI')
    .replace(/eleven\s*agents?/gi, 'InfoLead AI');
}

function isPermissionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('permission') ||
    m.includes('notallowed') ||
    m.includes('not allowed') ||
    m.includes('denied') ||
    m.includes('microphone') ||
    m.includes('mic')
  );
}

export default function LyraConversationCore(props: Props) {
  return (
    <ConversationProvider>
      <Conversation {...props} />
    </ConversationProvider>
  );
}

// Pull a HH:MM:SS timestamp out of a message id. Ids are formatted as
// either `${Date.now()}-${rand}` or `local-${Date.now()}` — the first
// 13-digit run is the millisecond stamp.
function idToTime(id: string): string {
  const m = id.match(/(\d{13})/);
  const date = m ? new Date(parseInt(m[1], 10)) : new Date();
  return date.toTimeString().slice(0, 8);
}

// Bilingual stacked status labels (always both languages in stage).
const STATUS_BILINGUAL: Record<LyraStatus, string> = {
  idle: 'IDLE · 待机',
  connecting: 'CONNECTING · 连接中',
  listening: 'LISTENING · 聆听中',
  thinking: 'THINKING · 思考中',
  speaking: 'SPEAKING · 朗读中',
  error: 'ERROR · 异常',
  blocked: 'BLOCKED · 不可用',
};

// Inline SVG mic glyphs — replace the toy 🎤 emoji with abstract icons
// that use currentColor so the gradient bg shines through cleanly.
const MicIdleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);
const MicActiveIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

function Conversation({ lang, agentId, initialAction, forceTextOnly, variant = 'standalone' }: Props) {
  const t = LYRA_COPY[lang];
  const shellRef = useRef<HTMLDivElement | null>(null);
  // Frozen at mount so the SYSTEM "awaiting input" entry's timestamp is
  // stable across re-renders.
  const [mountTime] = useState<string>(() => new Date().toTimeString().slice(0, 8));
  const [messages, setMessages] = useState<LyraMessage[]>(() => {
    if (initialAction.kind === 'text') {
      return [
        {
          id: `local-${Date.now()}`,
          role: 'user',
          content: initialAction.text,
        },
      ];
    }
    return [];
  });
  const [textMode, setTextMode] = useState(forceTextOnly || initialAction.kind === 'text');
  const [notice, setNotice] = useState<string | null>(
    forceTextOnly ? t.wechatNotice : null,
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const pendingTextRef = useRef<string | null>(
    initialAction.kind === 'text' ? initialAction.text : null,
  );
  const startedRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const handleMessage = useCallback(
    (props: { message: string; role: 'user' | 'agent' }) => {
      const text = (props.message || '').trim();
      if (!text) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: props.role === 'agent' ? 'lyra' : 'user',
          content: text,
        },
      ]);
    },
    [],
  );

  const handleError = useCallback(
    (message: string) => {
      const safe = scrubVendor(message || '');
      if (isPermissionError(safe)) {
        setTextMode(true);
        setNotice(t.permissionDenied);
        setErrorText(null);
        return;
      }
      setErrorText(safe || t.statusError);
    },
    [t.permissionDenied, t.statusError],
  );

  const conversation = useConversation({
    onMessage: handleMessage,
    onError: handleError,
    onConnect: () => {
      setErrorText(null);
      const queued = pendingTextRef.current;
      pendingTextRef.current = null;
      if (queued) {
        try {
          conversation.sendUserMessage(queued);
        } catch {
          /* surfaced via onError */
        }
      }
    },
    onDisconnect: () => {
      pendingTextRef.current = null;
    },
  });

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (initialAction.kind === 'voice' && !forceTextOnly) {
      try {
        conversation.startSession({
          agentId,
          connectionType: 'webrtc',
          overrides: { agent: { language: lang === 'zh' ? 'zh' : 'en' } },
        });
      } catch (e) {
        handleError(e instanceof Error ? e.message : 'Unable to start session');
      }
    } else {
      try {
        conversation.startSession({
          agentId,
          connectionType: 'websocket',
          textOnly: true,
          overrides: {
            agent: { language: lang === 'zh' ? 'zh' : 'en' },
            conversation: { textOnly: true },
          },
        });
      } catch (e) {
        handleError(e instanceof Error ? e.message : 'Unable to start session');
      }
    }
  }, [agentId, conversation, forceTextOnly, handleError, initialAction.kind, lang]);

  const status: LyraStatus = useMemo(() => {
    if (errorText) return 'error';
    if (isConnecting) return 'connecting';
    if (isConnected && conversation.isSpeaking) return 'speaking';
    if (isConnected && conversation.isListening) return 'listening';
    if (isConnected) return 'thinking';
    return 'idle';
  }, [errorText, isConnecting, isConnected, conversation.isSpeaking, conversation.isListening]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, status]);

  useEffect(() => {
    if (variant !== 'stage') return;
    const stage = shellRef.current?.closest('.agent-stage') as HTMLElement | null;
    if (!stage) return;
    let amp = 0.15;
    if (conversation.isSpeaking) amp = 0.95;
    else if (conversation.isListening) amp = 0.55;
    else if (isConnecting) amp = 0.3;
    stage.style.setProperty('--lyra-amp', String(amp));
  }, [variant, conversation.isSpeaking, conversation.isListening, isConnecting]);

  const sendText = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (isConnected) {
      try {
        conversation.sendUserMessage(text);
      } catch (e) {
        handleError(e instanceof Error ? e.message : 'Unable to send message');
      }
      return;
    }
    pendingTextRef.current = text;
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: text },
    ]);
  }, [draft, isConnected, conversation, handleError]);

  const stop = useCallback(() => {
    try {
      conversation.endSession();
    } catch {
      /* noop */
    }
  }, [conversation]);

  const restartVoice = useCallback(() => {
    setErrorText(null);
    setTextMode(false);
    try {
      conversation.startSession({
        agentId,
        connectionType: 'webrtc',
        overrides: { agent: { language: lang === 'zh' ? 'zh' : 'en' } },
      });
    } catch (e) {
      handleError(e instanceof Error ? e.message : 'Unable to start session');
    }
  }, [agentId, conversation, handleError, lang]);

  const showMic = !textMode;
  const statusLabel = STATUS_BILINGUAL[status] ?? STATUS_BILINGUAL.idle;

  return (
    <div
      className={`lyra-shell${variant === 'stage' ? ' lyra-shell--stage' : ''}`}
      ref={shellRef}
    >
      <div className="transcript-log" data-agent="lyra">
        <div className="transcript-header" data-agent="lyra">
          // LYRA-VOICE-01 LOG ACTIVE
        </div>
        <div
          className="transcript-log__entries"
          ref={messagesRef}
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="log-entry">
              <span className="log-timestamp">[{mountTime}]</span>
              <span className="log-role" data-role="system">SYSTEM:</span>
              <span className="log-content">{t.emptyPrompt}</span>
            </div>
          )}
          {messages.map((m, i) => {
            const isLastLyra =
              i === messages.length - 1 && m.role === 'lyra' && conversation.isSpeaking;
            return (
              <div
                key={m.id}
                className="log-entry"
                data-streaming={isLastLyra ? 'true' : undefined}
              >
                <span className="log-timestamp">[{idToTime(m.id)}]</span>
                <span
                  className="log-role"
                  data-role={m.role === 'lyra' ? 'lyra' : 'you'}
                >
                  {m.role === 'lyra' ? 'LYRA:' : 'YOU:'}
                </span>
                <span className="log-content">{m.content}</span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="transcript-log__new-indicator"
          aria-label={t.youLabel === '您' ? '新消息' : 'New messages'}
        >↓ NEW</button>
        <div className="transcript-footer">_ SESSION ACTIVE _</div>
      </div>

      <div className={`lyra-status lyra-status-${status}`} aria-live="polite">
        <span className="lyra-status-dot" />
        <span className="lyra-status-label">{statusLabel}</span>
      </div>

      {notice && <div className="lyra-notice">{notice}</div>}
      {errorText && (
        <div className="lyra-error" role="alert">
          <span>{errorText}</span>
          <button
            type="button"
            className="lyra-error-action"
            onClick={() => {
              setErrorText(null);
              setTextMode(true);
            }}
          >
            {t.fallbackToText}
          </button>
        </div>
      )}

      {showMic && (
        <div className="lyra-mic-group">
          <button
            type="button"
            className={`lyra-mic ${isConnected || isConnecting ? 'lyra-mic-active' : ''}`}
            onClick={isConnected || isConnecting ? stop : restartVoice}
            aria-label={isConnected || isConnecting ? t.micStop : t.micStart}
          >
            {isConnected || isConnecting ? <MicActiveIcon /> : <MicIdleIcon />}
          </button>
          <span className="lyra-mic-hint">{t.micHint}</span>
        </div>
      )}

      <div className="lyra-input-row">
        <textarea
          className="lyra-textarea"
          placeholder={t.inputPlaceholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          rows={1}
          maxLength={1000}
        />
        <button
          type="button"
          className="lyra-send"
          onClick={sendText}
          disabled={!draft.trim()}
        >
          {t.sendLabel}
        </button>
      </div>

      <div className="lyra-footer">{t.footer}</div>
    </div>
  );
}
