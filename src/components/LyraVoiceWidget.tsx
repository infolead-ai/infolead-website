import { Suspense, lazy, useEffect, useState } from 'react';
import { isAllowedHost } from '../lib/lyra-allowlist';
import { LYRA_COPY, detectWeChat } from '../lib/lyra-copy';
import type { Lang } from '../types/lyra';
import type { LyraVariant } from './LyraConversationCore';

interface Props {
  lang: Lang;
  variant?: LyraVariant;
}

const AGENT_ID = import.meta.env.PUBLIC_LYRA_AGENT_ID as string | undefined;

const LyraConversationCore = lazy(() => import('./LyraConversationCore'));

export type InitialAction = { kind: 'voice' } | { kind: 'text'; text: string };

export default function LyraVoiceWidget({ lang, variant = 'standalone' }: Props) {
  const t = LYRA_COPY[lang];
  const [hydrated, setHydrated] = useState(false);
  const [hostAllowed, setHostAllowed] = useState(true);
  const [hasConfig, setHasConfig] = useState(true);
  const [forceTextOnly, setForceTextOnly] = useState(false);
  const [active, setActive] = useState<InitialAction | null>(null);
  const [draft, setDraft] = useState('');

  const shellClass = `lyra-shell${variant === 'stage' ? ' lyra-shell--stage' : ''}`;

  useEffect(() => {
    setHydrated(true);
    setHostAllowed(isAllowedHost(window.location.hostname, !!import.meta.env.DEV));
    setHasConfig(typeof AGENT_ID === 'string' && AGENT_ID.length > 0);
    if (detectWeChat()) setForceTextOnly(true);
  }, []);

  if (!hydrated) {
    return (
      <div className={`${shellClass} lyra-shell-skeleton`} aria-busy="true">
        <div className="lyra-messages lyra-messages-skeleton" />
        <div className="lyra-status lyra-status-idle">
          <span className="lyra-status-dot" />
          <span className="lyra-status-label">{t.statusConnecting}</span>
        </div>
        <div className="lyra-footer">{t.footer}</div>
      </div>
    );
  }

  if (!hostAllowed) {
    return (
      <ShellBlocked
        shellClass={shellClass}
        title={t.blockedTitle}
        body={t.blockedBody}
        statusLabel={t.statusBlocked}
        footer={t.footer}
      />
    );
  }

  if (!hasConfig) {
    return (
      <ShellBlocked
        shellClass={shellClass}
        title={t.blockedTitle}
        body={t.missingConfig}
        statusLabel={t.statusBlocked}
        footer={t.footer}
      />
    );
  }

  if (active) {
    return (
      <Suspense
        fallback={
          <div className={shellClass} aria-busy="true">
            <div className="lyra-messages lyra-messages-skeleton" />
            <div className="lyra-status lyra-status-connecting">
              <span className="lyra-status-dot" />
              <span className="lyra-status-label">{t.statusConnecting}</span>
            </div>
            <div className="lyra-footer">{t.footer}</div>
          </div>
        }
      >
        <LyraConversationCore
          lang={lang}
          agentId={AGENT_ID as string}
          initialAction={active}
          forceTextOnly={forceTextOnly}
          variant={variant}
        />
      </Suspense>
    );
  }

  const submitText = () => {
    const text = draft.trim();
    if (!text) return;
    setActive({ kind: 'text', text });
  };

  return (
    <div className={shellClass}>
      <div className="lyra-messages" role="log" aria-live="polite">
        <div className="lyra-empty">
          <div className="lyra-empty-orb" aria-hidden="true" />
          <p className="lyra-empty-text">{t.emptyPrompt}</p>
        </div>
      </div>

      <div className="lyra-status lyra-status-idle" aria-live="polite">
        <span className="lyra-status-dot" />
        <span className="lyra-status-label">{t.statusIdle}</span>
      </div>

      {forceTextOnly && <div className="lyra-notice">{t.wechatNotice}</div>}

      <div className="lyra-input-row">
        {!forceTextOnly && (
          <button
            type="button"
            className="lyra-mic"
            onClick={() => setActive({ kind: 'voice' })}
            aria-label={t.micStart}
          >
            <span className="lyra-mic-glyph" aria-hidden="true">
              🎤
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
              submitText();
            }
          }}
          rows={1}
          maxLength={1000}
        />
        <button
          type="button"
          className="lyra-send"
          onClick={submitText}
          disabled={!draft.trim()}
        >
          {t.sendLabel}
        </button>
      </div>

      <div className="lyra-footer">{t.footer}</div>
    </div>
  );
}

function ShellBlocked({
  shellClass,
  title,
  body,
  statusLabel,
  footer,
}: {
  shellClass: string;
  title: string;
  body: string;
  statusLabel: string;
  footer: string;
}) {
  return (
    <div className={`${shellClass} lyra-shell-blocked`}>
      <div className="lyra-blocked">
        <div className="lyra-blocked-title">{title}</div>
        <div className="lyra-blocked-body">{body}</div>
      </div>
      <div className="lyra-status lyra-status-blocked">
        <span className="lyra-status-dot" />
        <span className="lyra-status-label">{statusLabel}</span>
      </div>
      <div className="lyra-footer">{footer}</div>
    </div>
  );
}
