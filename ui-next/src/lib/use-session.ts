"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { GatewayClient, GatewayEventFrame } from "./gateway";
import {
  useSessionStore,
  useSession,
  useSessionField,
  type ChatMessage,
  type ChatStatus,
  type MessagePart,
  type ToolExecutionState,
  type SubagentState,
  type SessionData,
} from "./session-store";

// Re-export types for convenience
export type { ChatMessage, ChatStatus, MessagePart, ToolExecutionState, SubagentState, SessionData };
export { useSession, useSessionField };

/**
 * Result from useSessionData hook.
 * All session fields in a single subscription.
 */
export interface SessionDataResult {
  messages: ChatMessage[];
  status: ChatStatus;
  streamingContent: string;
  streamingMessageId: string | null; // ID of message being streamed (for inline streaming)
  error: string | null;
  historyLoading: boolean;
  historyLoaded: boolean;
  toolExecutions: Map<string, ToolExecutionState>;
  subagents: Map<string, SubagentState>;
  messageQueue: string[];
}

// Cache for empty session defaults to avoid infinite re-render loops
const emptySessionCache = new Map<string, SessionDataResult>();

function getEmptySessionData(sessionKey: string): SessionDataResult {
  const cached = emptySessionCache.get(sessionKey);
  if (cached) return cached;

  const empty: SessionDataResult = {
    messages: [],
    status: "idle" as ChatStatus,
    streamingContent: "",
    streamingMessageId: null,
    error: null,
    historyLoading: false,
    historyLoaded: false,
    toolExecutions: new Map(),
    subagents: new Map(),
    messageQueue: [],
  };
  emptySessionCache.set(sessionKey, empty);
  return empty;
}

/**
 * Optimized hook to get all session data in a single Zustand subscription.
 * Uses shallow comparison to minimize re-renders.
 *
 * Replaces 8+ individual useSessionField calls with one subscription.
 */
export function useSessionData(sessionKey: string): SessionDataResult {
  return useSessionStore(
    useShallow((state) => {
      const session = state.sessions.get(sessionKey);
      if (!session) {
        return getEmptySessionData(sessionKey);
      }
      return {
        messages: session.messages,
        status: session.status,
        streamingContent: session.streamingContent,
        streamingMessageId: session.streamingMessageId,
        error: session.error,
        historyLoading: session.historyLoading,
        historyLoaded: session.historyLoaded,
        toolExecutions: session.toolExecutions,
        subagents: session.subagents,
        messageQueue: session.messageQueue,
      };
    })
  );
}

/**
 * Hook to manage scroll state for a session.
 * Call setScrollState before switching sessions to preserve position.
 */
export function useSessionScroll(sessionKey: string) {
  const isAtBottom = useSessionField(sessionKey, (s) => s.isAtBottom);
  const scrollOffset = useSessionField(sessionKey, (s) => s.scrollOffset);
  const setScrollState = useSessionStore((s) => s.setScrollState);

  const saveScrollState = useCallback(
    (atBottom: boolean, offset?: number | null) => {
      setScrollState(sessionKey, atBottom, offset);
    },
    [sessionKey, setScrollState]
  );

  return {
    isAtBottom,
    scrollOffset,
    saveScrollState,
    // For the Conversation component: instant if at bottom, smooth otherwise
    scrollBehavior: isAtBottom ? "instant" : "smooth",
  };
}

/**
 * Initialize WebSocket event routing to the session store.
 * Call this once at app root level.
 */
export function useSessionStoreSubscription(
  subscribe: (event: string, handler: (evt: GatewayEventFrame) => void) => () => void
) {
  const processChatEvent = useSessionStore((s) => s.processChatEvent);
  const processAgentEvent = useSessionStore((s) => s.processAgentEvent);

  useEffect(() => {
    // Subscribe to chat events and route to store
    const unsubChat = subscribe("chat", (evt) => {
      processChatEvent(evt);
    });

    // Subscribe to agent events and route to store
    const unsubAgent = subscribe("agent", (evt) => {
      processAgentEvent(evt);
    });

    return () => {
      unsubChat();
      unsubAgent();
    };
  }, [subscribe, processChatEvent, processAgentEvent]);
}

/**
 * Hook for interacting with a specific session.
 * Provides backwards-compatible API with useOpenClawChat.
 */
export function useSessionChat(
  client: GatewayClient | null,
  sessionKey: string = "agent:main:main",
  subscribe: (event: string, handler: (evt: GatewayEventFrame) => void) => () => void,
  onMessageSent?: () => void
) {
  // Get store actions
  const loadHistory = useSessionStore((s) => s.loadSessionHistory);
  const sendMessageAction = useSessionStore((s) => s.sendMessage);
  const abortAction = useSessionStore((s) => s.abort);
  const touchSession = useSessionStore((s) => s.touchSession);

  // Get session data with optimized selectors
  const messages = useSessionField(sessionKey, (s) => s.messages);
  const status = useSessionField(sessionKey, (s) => s.status);
  const streamingContent = useSessionField(sessionKey, (s) => s.streamingContent);
  const error = useSessionField(sessionKey, (s) => s.error);
  const historyLoading = useSessionField(sessionKey, (s) => s.historyLoading);
  const toolExecutions = useSessionField(sessionKey, (s) => s.toolExecutions);
  const subagents = useSessionField(sessionKey, (s) => s.subagents);
  const messageQueue = useSessionField(sessionKey, (s) => s.messageQueue);

  // Track session key for callbacks
  const sessionKeyRef = useRef(sessionKey);
  useEffect(() => {
    sessionKeyRef.current = sessionKey;
  }, [sessionKey]);

  // Load history when session changes
  useEffect(() => {
    if (client) {
      loadHistory(sessionKey, client);
    }
  }, [client, sessionKey, loadHistory]);

  // Touch session on access (for LRU)
  useEffect(() => {
    touchSession(sessionKey);
  }, [sessionKey, touchSession]);

  // Process message queue when idle
  useEffect(() => {
    if (status === "idle" && messageQueue.length > 0 && client) {
      const [next, ...rest] = messageQueue;
      // Update queue and send
      useSessionStore.getState().updateSession(sessionKey, (s) => ({
        messageQueue: rest,
      }));
      sendMessageAction(sessionKey, next, client);
    }
  }, [status, messageQueue, sessionKey, client, sendMessageAction]);

  // Notify on message completion
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status === "idle") {
      onMessageSent?.();
    }
    prevStatusRef.current = status;
  }, [status, onMessageSent]);

  // Actions
  const sendMessage = useCallback(
    async (content: string) => {
      if (!client) return;
      await sendMessageAction(sessionKeyRef.current, content, client);
    },
    [client, sendMessageAction]
  );

  const abort = useCallback(async () => {
    if (!client) return;
    await abortAction(sessionKeyRef.current, client);
  }, [client, abortAction]);

  const regenerate = useCallback(async () => {
    if (!client || messages.length === 0) return;

    const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const lastUserMessage = messages[lastUserIdx];

    // Remove messages after last user message
    useSessionStore.getState().updateSession(sessionKeyRef.current, (s) => ({
      messages: s.messages.slice(0, lastUserIdx + 1),
    }));

    // Resend
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    useSessionStore.getState().updateSession(sessionKeyRef.current, () => ({
      status: "submitted",
      currentRunId: runId,
    }));

    try {
      await client.sendChat(lastUserMessage.content, sessionKeyRef.current, runId);
    } catch (err) {
      useSessionStore.getState().updateSession(sessionKeyRef.current, () => ({
        error: err instanceof Error ? err.message : "Failed to regenerate",
        status: "error",
        currentRunId: null,
      }));
    }
  }, [client, messages]);

  const stopSubagent = useCallback(
    async (childSessionKey: string) => {
      if (!client) return;
      try {
        await client.sendChat("/stop", childSessionKey);
        useSessionStore.getState().updateSession(sessionKeyRef.current, (s) => {
          const next = new Map(s.subagents);
          for (const [id, sub] of next) {
            if (sub.childSessionKey === childSessionKey) {
              next.set(id, {
                ...sub,
                status: "error",
                error: "Stopped by user",
                completedAt: Date.now(),
              });
              break;
            }
          }
          return { subagents: next };
        });
      } catch (err) {
        console.error("Failed to stop subagent:", err);
      }
    },
    [client]
  );

  return {
    messages,
    status,
    streamingContent,
    error,
    toolExecutions,
    subagents,
    sendMessage,
    abort,
    regenerate,
    stopSubagent,
    isStreaming: status === "streaming",
    isSubmitted: status === "submitted",
    canAbort: status === "streaming" || status === "submitted",
    historyLoading,
    messageQueue,
    queueLength: messageQueue.length,
  };
}

/**
 * Clear tool executions for a session when they're persisted in message parts
 */
export function useToolExecutionCleanup(sessionKey: string) {
  const messages = useSessionField(sessionKey, (s) => s.messages);
  const toolExecutions = useSessionField(sessionKey, (s) => s.toolExecutions);
  const status = useSessionField(sessionKey, (s) => s.status);

  useEffect(() => {
    // Find persisted tool IDs in latest message
    const latestAssistant = [...messages].reverse().find(
      (m) => m.role === "assistant" && m.parts?.length
    );

    if (!latestAssistant?.parts) return;

    const persistedIds = new Set(
      latestAssistant.parts
        .filter((p) => p.type === "tool-call" || p.type === "tool-result")
        .map((p) => (p as { toolCallId: string }).toolCallId)
    );

    if (persistedIds.size === 0) return;

    // Remove persisted tools from toolExecutions
    useSessionStore.getState().updateSession(sessionKey, (s) => {
      let changed = false;
      const next = new Map(s.toolExecutions);
      for (const id of s.toolExecutions.keys()) {
        if (persistedIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? { toolExecutions: next } : {};
    });
  }, [messages, sessionKey]);

  // Fallback cleanup when idle
  useEffect(() => {
    if (status === "idle" && toolExecutions.size > 0) {
      const timer = setTimeout(() => {
        useSessionStore.getState().updateSession(sessionKey, (s) => {
          const hasExecuting = Array.from(s.toolExecutions.values()).some(
            (t) => t.phase === "executing"
          );
          if (hasExecuting) return {};
          return { toolExecutions: new Map() };
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [status, toolExecutions.size, sessionKey]);
}

/**
 * Persist subagents to message parts when they complete
 */
export function useSubagentPersistence(sessionKey: string) {
  const subagents = useSessionField(sessionKey, (s) => s.subagents);
  const persistedIds = useSessionField(sessionKey, (s) => s.persistedSubagentIds);

  useEffect(() => {
    const completed: Array<[string, SubagentState]> = [];

    for (const [id, sub] of subagents) {
      if (
        (sub.status === "completed" || sub.status === "error" || sub.status === "timeout") &&
        sub.completedAt &&
        !persistedIds.has(id)
      ) {
        completed.push([id, sub]);
      }
    }

    if (completed.length === 0) return;

    useSessionStore.getState().updateSession(sessionKey, (s) => {
      const newPersistedIds = new Set(s.persistedSubagentIds);
      const newMessages = [...s.messages];

      for (const [id, sub] of completed) {
        newPersistedIds.add(id);

        const subagentPart = {
          type: "subagent" as const,
          toolCallId: sub.toolCallId,
          task: sub.task,
          label: sub.label,
          model: sub.model,
          status: sub.status as "completed" | "error" | "timeout",
          duration: sub.completedAt ? sub.completedAt - sub.startedAt : 0,
          resultSummary: sub.resultSummary,
          childSessionKey: sub.childSessionKey,
        };

        const lastAssistantIdx = newMessages.findLastIndex((m) => m.role === "assistant");

        if (lastAssistantIdx >= 0) {
          const msg = newMessages[lastAssistantIdx];
          newMessages[lastAssistantIdx] = {
            ...msg,
            parts: [...(msg.parts || []), subagentPart],
          };
        } else {
          newMessages.push({
            id: `assistant-subagent-${Date.now()}`,
            role: "assistant",
            content: "",
            parts: [subagentPart],
            timestamp: Date.now(),
          });
        }
      }

      return {
        messages: newMessages,
        persistedSubagentIds: newPersistedIds,
      };
    });
  }, [subagents, persistedIds, sessionKey]);
}
