"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSessionStore } from "@/lib/session-store";
import { useSessionData } from "@/lib/use-session";
import type { GatewayClient } from "@/lib/gateway";
import type {
  ChatMessage,
  ChatStatus,
  ToolExecutionState,
  SubagentState,
} from "@/lib/session-store";

interface ChatContextValue {
  // Session identity
  sessionKey: string;

  // Data
  messages: ChatMessage[];
  status: ChatStatus;
  streamingContent: string;
  streamingMessageId: string | null; // ID of message being streamed inline
  error: string | null;
  historyLoading: boolean;
  historyLoaded: boolean;
  toolExecutions: Map<string, ToolExecutionState>;
  subagents: Map<string, SubagentState>;
  messageQueue: string[];

  // Derived
  isStreaming: boolean;
  isSubmitted: boolean;
  canAbort: boolean;
  queueLength: number;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  abort: () => Promise<void>;
  regenerate: () => Promise<void>;
  stopSubagent: (childSessionKey: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
  client: GatewayClient | null;
  sessionKey: string;
  onMessageSent?: () => void;
}

export function ChatProvider({
  children,
  client,
  sessionKey,
  onMessageSent,
}: ChatProviderProps) {
  // Get session data using optimized selector
  const sessionData = useSessionData(sessionKey);

  // Get store actions
  const sendMessageAction = useSessionStore((s) => s.sendMessage);
  const abortAction = useSessionStore((s) => s.abort);
  const loadHistory = useSessionStore((s) => s.loadSessionHistory);
  const touchSession = useSessionStore((s) => s.touchSession);

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
    if (sessionData.status === "idle" && sessionData.messageQueue.length > 0 && client) {
      const [next, ...rest] = sessionData.messageQueue;
      useSessionStore.getState().updateSession(sessionKey, () => ({
        messageQueue: rest,
      }));
      sendMessageAction(sessionKey, next, client);
    }
  }, [sessionData.status, sessionData.messageQueue, sessionKey, client, sendMessageAction]);

  // Notify on message completion
  const prevStatusRef = useRef(sessionData.status);
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && sessionData.status === "idle") {
      onMessageSent?.();
    }
    prevStatusRef.current = sessionData.status;
  }, [sessionData.status, onMessageSent]);

  // Memoized actions
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
    if (!client) return;

    const currentSession = useSessionStore.getState().sessions.get(sessionKeyRef.current);
    const messages = currentSession?.messages ?? [];

    if (messages.length === 0) return;

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
  }, [client]);

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

  // Memoized context value
  const value = useMemo<ChatContextValue>(
    () => ({
      sessionKey,
      ...sessionData,
      isStreaming: sessionData.status === "streaming",
      isSubmitted: sessionData.status === "submitted",
      canAbort: sessionData.status === "streaming" || sessionData.status === "submitted",
      queueLength: sessionData.messageQueue.length,
      sendMessage,
      abort,
      regenerate,
      stopSubagent,
    }),
    [sessionKey, sessionData, sendMessage, abort, regenerate, stopSubagent]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}

// Non-throwing version for conditional usage
export function useChatContextOptional(): ChatContextValue | null {
  return useContext(ChatContext);
}
