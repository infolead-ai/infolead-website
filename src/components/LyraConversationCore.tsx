import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { LYRA_COPY } from '../lib/lyra-copy';
import type { Lang, LyraMessage, LyraStatus } from '../types/lyra';
import type { InitialAction } from './LyraVoiceWidget';

interface Props {
  lang: Lang;
  agentId: string;
  initialAction: InitialAction;
  forceTextOnly: boolean;
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

function Conversation({ lang, agentId, initialAction, forceTextOnly }: Props) {
  const t = LYRA_COPY[lang];
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
  const statusLabel =
    status === 'idle'
      ? t.statusIdle
      : status === 'connecting'
        ? t.statusConnecting
        : status === 'listening'
          ? t.statusListening
          : status === 'thinking'
            ? t.statusThinking
            : status === 'speaking'
              ? t.statusSpeaking
              : status === 'error'
                ? t.statusError
                : t.statusBlocked;

  return (
    <div className="lyra-shell">
      <div className="lyra-messages" ref={messagesRef} role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="lyra-empty">
            <div className="lyra-empty-orb" aria-hidden="true" />
            <p className="lyra-empty-text">{t.emptyPrompt}</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`lyra-bubble lyra-bubble-${m.role}`}>
            <div className="lyra-bubble-label">
              {m.role === 'lyra' ? t.lyraLabel : t.youLabel}
            </div>
            <div className="lyra-bubble-content">{m.content}</div>
          </div>
        ))}
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

      <div className="lyra-input-row">
        {showMic && (
          <button
            type="button"
            className={`lyra-mic ${isConnected || isConnecting ? 'lyra-mic-active' : ''}`}
            onClick={isConnected || isConnecting ? stop : restartVoice}
            aria-label={isConnected || isConnecting ? t.micStop : t.micStart}
          >
            <span className="lyra-mic-glyph" aria-hidden="true">
              {isConnected || isConnecting ? '■' : '🎤'}
            </span>
          </button>
        )}
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
