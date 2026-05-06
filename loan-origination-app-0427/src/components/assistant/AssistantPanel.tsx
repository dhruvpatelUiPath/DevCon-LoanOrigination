import { useEffect, useRef, useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { useAssistantChat } from '../../hooks/useAssistantChat';
import type { AssistantMessage } from '../../hooks/useAssistantChat';

const SUGGESTED_CHIPS_GLOBAL = [
  'Summarize my pipeline',
  'Which loans need my input today?',
  'Any SLA risks in the next 48h?',
];

const SUGGESTED_CHIPS_CASE = [
  "What's the current DTI?",
  'Summarize all conditions',
  'Show similar past cases',
  'What should I do next?',
];

export function AssistantPanel() {
  const { isOpen, close, context } = useAssistant();
  const { messages, isStreaming, isConfigured, sendMessage, reset, error } = useAssistantChat();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message / chunk
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const chips = context ? SUGGESTED_CHIPS_CASE : SUGGESTED_CHIPS_GLOBAL;

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setDraft('');
    await sendMessage(text, context ? { caseContext: context } : undefined);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.35)' }}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-full max-w-[440px] flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="agent-avatar w-8 h-8 rounded-[10px] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#0E2A47,#1E4480)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
              Case Manager Agent
            </div>
            <div
              className="text-[11px] flex items-center gap-1.5 mt-px"
              style={{ color: isConfigured ? 'var(--green)' : 'var(--amber)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isConfigured ? 'var(--green)' : 'var(--amber)',
                  animation: isConfigured ? 'lp-pulse 2s infinite' : undefined,
                }}
              />
              {isConfigured ? 'Live' : 'Setup required'}
              {context && isConfigured && (
                <>
                  <span className="mx-1" style={{ color: 'var(--fg4)' }}>
                    ·
                  </span>
                  <span className="truncate" style={{ color: 'var(--fg3)' }}>
                    {context.label}
                  </span>
                </>
              )}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="text-[11px] px-2 py-1 rounded-md"
              style={{
                background: 'var(--elevated)',
                color: 'var(--fg3)',
                border: '1px solid var(--border)',
              }}
              aria-label="Clear conversation"
            >
              New
            </button>
          )}
          <button
            onClick={close}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--fg3)',
            }}
            aria-label="Close assistant"
          >
            ✕
          </button>
        </div>

        {/* Setup banner when agent not configured */}
        {!isConfigured && (
          <div
            className="flex-shrink-0 px-4 py-3 text-[12px] leading-relaxed"
            style={{
              background: 'var(--amber-bg)',
              color: 'var(--fg2)',
              borderBottom: '1px solid var(--amber-bd)',
            }}
          >
            Set <span className="mono">VITE_CASE_MANAGER_AGENT_ID</span> and{' '}
            <span className="mono">VITE_CASE_MANAGER_FOLDER_ID</span> in <span className="mono">.env</span>,
            and add <span className="mono">OR.Jobs</span> + <span className="mono">ConversationalAgents</span>{' '}
            scopes to the External App. Restart the dev server after.
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ background: 'var(--bg)' }}>
          {messages.length === 0 ? (
            <EmptyState chips={chips} onPick={(c) => setDraft(c)} contextLabel={context?.label} />
          ) : (
            messages.map((m) => <Bubble key={m.id} message={m} />)
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="flex-shrink-0 px-4 py-2 text-[11px]"
            style={{
              background: 'var(--red-bg)',
              color: 'var(--red)',
              borderTop: '1px solid rgba(220,38,38,0.2)',
            }}
          >
            {error}
          </div>
        )}

        {/* Input */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend(draft);
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[12px]"
            style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isConfigured ? 'Ask the case manager anything…' : 'Try a question (demo mode)…'
              }
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none text-[13px] disabled:opacity-60"
              style={{ color: 'var(--fg)' }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!draft.trim() || isStreaming}
              className="w-7 h-7 rounded-[7px] text-white flex items-center justify-center disabled:opacity-40"
              style={{ background: 'var(--purple)' }}
              aria-label="Send"
            >
              ↑
            </button>
          </form>
          {messages.length === 0 && chips.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft(c)}
                  className="px-2.5 py-1 rounded-[14px] text-[11px]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg3)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function EmptyState({
  chips,
  onPick,
  contextLabel,
}: {
  chips: string[];
  onPick: (c: string) => void;
  contextLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center pt-10 px-4">
      <div
        className="agent-avatar w-12 h-12 rounded-[14px] mb-3"
        style={{ background: 'linear-gradient(135deg,#0E2A47,#1E4480)' }}
      />
      <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--fg)' }}>
        {contextLabel ? `Ask about ${contextLabel}` : 'How can I help?'}
      </div>
      <div className="text-[12px] leading-relaxed mb-4" style={{ color: 'var(--fg3)' }}>
        {contextLabel
          ? 'Agent has the loan context loaded.'
          : 'Ask about your pipeline, a specific case, or policies.'}
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="text-left px-3 py-2 rounded-lg text-[12px]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--fg2)',
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: AssistantMessage }) {
  if (message.role === 'system') {
    return (
      <div
        className="text-[11px] mono leading-relaxed px-3 py-2 rounded-md mb-3"
        style={{
          background: 'var(--elevated)',
          color: 'var(--fg4)',
          border: '1px dashed var(--border)',
        }}
      >
        context: {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {isUser ? (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
          style={{ background: 'var(--blue)' }}
        >
          DP
        </div>
      ) : (
        <div
          className="agent-avatar w-7 h-7 rounded-[9px] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#0E2A47,#1E4480)' }}
        />
      )}
      <div
        className="max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? {
                background: 'var(--blue)',
                color: '#fff',
                borderRadius: '12px 2px 12px 12px',
              }
            : {
                background: 'var(--surface)',
                color: 'var(--fg2)',
                border: '1px solid var(--border)',
                borderRadius: '2px 12px 12px 12px',
              }
        }
      >
        {message.content || (message.isStreaming && <TypingDots />)}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center py-1">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </span>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{
        background: 'var(--fg4)',
        animation: 'lp-sp 1.2s infinite',
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
