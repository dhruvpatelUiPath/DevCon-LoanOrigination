import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConversationalAgent,
  MessageRole,
} from '@uipath/uipath-typescript/conversational-agent';
import { useAuth } from './useAuth';
import type { AssistantContextBlurb } from './useAssistant';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildCaseContextBlock(ctx: AssistantContextBlurb): string {
  const lines: string[] = ['<case-context>'];
  if (ctx.instanceId) lines.push(`  <instanceId>${escapeXml(ctx.instanceId)}</instanceId>`);
  if (ctx.folderKey) lines.push(`  <folderKey>${escapeXml(ctx.folderKey)}</folderKey>`);
  if (ctx.caseId) lines.push(`  <caseId>${escapeXml(ctx.caseId)}</caseId>`);
  if (ctx.body) lines.push(`  <summary>${escapeXml(ctx.body)}</summary>`);
  lines.push('</case-context>');
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Configuration — reads VITE_CASE_MANAGER_AGENT_ID and VITE_CASE_MANAGER_FOLDER_ID
// from .env. See .env for setup instructions.
//
// Both must be NUMBERS. The SDK's conversations.create(agentId, folderId)
// takes numeric IDs (not the folderKey GUID used elsewhere in this app).
// ────────────────────────────────────────────────────────────────────────────
const AGENT_ID_RAW = (import.meta.env.VITE_CASE_MANAGER_AGENT_ID as string | undefined)?.trim() || '';
const FOLDER_ID_RAW = (import.meta.env.VITE_CASE_MANAGER_FOLDER_ID as string | undefined)?.trim() || '';
const AGENT_ID = Number(AGENT_ID_RAW);
const FOLDER_ID = Number(FOLDER_ID_RAW);
const IS_CONFIGURED =
  Number.isFinite(AGENT_ID) &&
  AGENT_ID > 0 &&
  Number.isFinite(FOLDER_ID) &&
  FOLDER_ID > 0;

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  createdAt: number;
}

export interface UseAssistantChatResult {
  messages: AssistantMessage[];
  isStreaming: boolean;
  isReady: boolean;
  isConfigured: boolean;
  error: string | null;
  sendMessage: (text: string, opts?: { caseContext?: AssistantContextBlurb }) => Promise<void>;
  reset: () => void;
}

export function useAssistantChat(): UseAssistantChatResult {
  const { sdk } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReady, setIsReady] = useState(IS_CONFIGURED ? false : true); // no-agent mode is "ready" immediately
  const [error, setError] = useState<string | null>(null);

  // Session + conversation refs — initialized lazily on first sendMessage.
  // Using refs so StrictMode double-mount doesn't create two sessions.
  const sessionRef = useRef<Awaited<
    ReturnType<Awaited<ReturnType<ConversationalAgent['conversations']['create']>>['startSession']>
  > | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const seededRef = useRef(false);

  // Map exchangeId → the placeholder assistant message ID we created before
  // sending. onMessageStart/onChunk look this up to know which bubble to update.
  const exchangeToMessageRef = useRef<Map<string, string>>(new Map());

  const appendChunk = useCallback((assistantMessageId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMessageId ? { ...m, content: (m.content ?? '') + chunk } : m,
      ),
    );
  }, []);

  const finishStreaming = useCallback((assistantMessageId?: string) => {
    setIsStreaming(false);
    if (assistantMessageId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMessageId ? { ...m, isStreaming: false } : m)),
      );
    }
  }, []);

  const ensureSession = useCallback(async () => {
    if (!IS_CONFIGURED) throw new Error('Conversational Agent is not configured.');
    if (sessionRef.current) return sessionRef.current;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return sessionRef.current!;
    }

    initPromiseRef.current = (async () => {
      const ca = new ConversationalAgent(sdk);

      // Verify the agent actually exists in the configured folder. This makes
      // misconfiguration fail loudly instead of opening a session that never
      // streams anything back.
      const agentsInFolder = await ca.getAll(FOLDER_ID);
      const agent = agentsInFolder.find((a) => a.id === AGENT_ID);
      if (!agent) {
        const ids = agentsInFolder.map((a) => a.id).join(', ') || '(none)';
        throw new Error(
          `Agent ${AGENT_ID} not found in folder ${FOLDER_ID}. Agents visible there: ${ids}.`,
        );
      }
      console.info('[assistant] using agent', { id: agent.id, name: agent.name, folderId: agent.folderId });

      // Use the agent-bound shorthand so agentId/folderId are guaranteed
      // consistent with the agent we just verified.
      const conversation = await agent.conversations.create({
        autogenerateLabel: true,
      });
      console.info('[assistant] conversation created', conversation.id);
      const session = await conversation.startSession({ echo: true });
      console.info('[assistant] session created — waiting for server ack');

      // Wait for the server to acknowledge the session before allowing any
      // exchanges. Without this, the very first user send can race ahead of
      // the session_start being fully accepted, and the service rejects the
      // exchange with EXCHANGE_START_PROCESSING_FAILED.
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        session.onSessionStarted(() => {
          console.info('[assistant] session started (server ack)');
          finish();
        });
        // Safety timeout — don't block forever if the server never sends ack.
        window.setTimeout(() => {
          if (!done) console.warn('[assistant] session ack timeout — proceeding anyway');
          finish();
        }, 4000);
      });

      // Wire streaming handlers ONCE per session.
      session.onExchangeStart((exchange) => {
        const exchangeId = exchange.exchangeId;
        console.info('[assistant] exchange started', exchangeId);
        exchange.onMessageStart((message) => {
          console.info('[assistant] message started', { isAssistant: message.isAssistant });
          if (!message.isAssistant) return;
          const assistantMessageId = exchangeToMessageRef.current.get(exchangeId);
          if (!assistantMessageId) return;

          message.onContentPartStart((part) => {
            part.onChunk((chunk) => {
              const data = (chunk as { data?: string }).data ?? '';
              if (data) appendChunk(assistantMessageId, data);
            });
          });
        });
        exchange.onExchangeEnd(() => {
          console.info('[assistant] exchange ended', exchangeId);
          const assistantMessageId = exchangeToMessageRef.current.get(exchangeId);
          exchangeToMessageRef.current.delete(exchangeId);
          finishStreaming(assistantMessageId);
        });
      });

      sessionRef.current = session;
      setIsReady(true);
    })();

    try {
      await initPromiseRef.current;
    } catch (err) {
      initPromiseRef.current = null;
      throw err;
    }
    return sessionRef.current!;
  }, [sdk, appendChunk, finishStreaming]);

  const sendMessage = useCallback<UseAssistantChatResult['sendMessage']>(
    async (text, opts) => {
      if (!text.trim()) return;

      const trimmed = text.trim();
      const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Optimistically append user + empty assistant placeholder BEFORE
      // we touch the SDK — avoids the multi-second blank pause.
      setMessages((prev) => {
        const additions: AssistantMessage[] = [];
        // Show a one-time system bubble so the user sees the case is loaded.
        // The actual <case-context> block goes on every wire payload below.
        if (opts?.caseContext && !seededRef.current) {
          seededRef.current = true;
          additions.push({
            id: `sys-${Date.now()}`,
            role: 'system',
            content: opts.caseContext.body,
            createdAt: Date.now(),
          });
        }
        additions.push({ id: userId, role: 'user', content: trimmed, createdAt: Date.now() });
        additions.push({
          id: assistantId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          createdAt: Date.now(),
        });
        return [...prev, ...additions];
      });

      if (!IS_CONFIGURED) {
        // Demo fallback so the UI is still usable without a real agent.
        setIsStreaming(true);
        window.setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      'Conversational Agent is not configured. Set VITE_CASE_MANAGER_AGENT_ID and VITE_CASE_MANAGER_FOLDER_ID in .env, then restart the dev server to enable live streaming responses.',
                    isStreaming: false,
                  }
                : m,
            ),
          );
          setIsStreaming(false);
        }, 300);
        return;
      }

      setIsStreaming(true);
      setError(null);
      try {
        const session = await ensureSession();
        // The SDK's internal makeId() returns crypto.randomUUID().toUpperCase().
        // The service rejected our previous custom format with
        // EXCHANGE_START_PROCESSING_FAILED ("Exchange ... has no start event"),
        // so match the same UUID shape here.
        const exchangeId = crypto.randomUUID().toUpperCase();
        exchangeToMessageRef.current.set(exchangeId, assistantId);

        const exchange = session.startExchange({ exchangeId });

        // Prepend a structured <case-context> block on EVERY user message so
        // tools like Get Case State can read instanceId + folderKey reliably
        // (folderKey populates the x-uipath-folderkey header). Without this
        // on every turn, follow-up messages lose context and tool calls 400.
        const ctx = opts?.caseContext;
        const hasIds = !!(ctx?.instanceId && ctx?.folderKey);
        const payload = hasIds ? `${buildCaseContextBlock(ctx!)}\n\n${trimmed}` : trimmed;

        // Explicit message lifecycle (matches the SDK reference's recommended
        // pattern). One-shot helpers were not eliciting agent responses.
        const message = exchange.startMessage({ role: MessageRole.User });
        await message.sendContentPart({ data: payload });
        message.sendMessageEnd();
        console.info('[assistant] user message sent', { exchangeId, length: payload.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent request failed.';
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${msg}`, isStreaming: false }
              : m,
          ),
        );
        setIsStreaming(false);
      }
    },
    [ensureSession],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    seededRef.current = false;
    exchangeToMessageRef.current.clear();
    // Note: we keep the session open across resets so the user doesn't
    // wait for a fresh handshake. Full teardown happens on unmount below.
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current = null;
      initPromiseRef.current = null;
    };
  }, []);

  return {
    messages,
    isStreaming,
    isReady,
    isConfigured: IS_CONFIGURED,
    error,
    sendMessage,
    reset,
  };
}
