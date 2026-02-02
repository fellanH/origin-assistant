"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GatewayClient, GatewayEventFrame, GatewayHelloOk, SessionStats } from "./gateway";
import {
  getLocalMessages,
  addLocalMessage,
  saveLocalMessages,
  type StoredMessage,
  type StoredMessagePart,
} from "./storage";

/**
 * Discriminated union for message content blocks.
 * Maps to gateway's content array structure.
 */
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      name: string;
      args?: unknown;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      name: string;
      result?: unknown;
      isError?: boolean;
    };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string; // Plain text (backwards compat + search)
  parts?: MessagePart[]; // Structured content blocks
  timestamp?: number;
};

/**
 * Live tool execution state, tracked via agent events.
 * This is ephemeral (not persisted) - used only during active streaming.
 */
export type ToolExecutionState = {
  toolCallId: string;
  name: string;
  phase: "executing" | "result" | "error";
  meta?: string; // e.g., file path, command preview
  args?: unknown; // Tool input (from start event)
  result?: unknown; // Tool output (from result event)
  isError?: boolean;
  startedAt: number; // For duration tracking
};

/**
 * Subagent state, tracked via sessions_spawn tool calls.
 * Lifecycle: spawning → running → completed/error/timeout
 */
export type SubagentState = {
  toolCallId: string;
  task: string;
  label?: string;
  model?: string;
  status: "spawning" | "running" | "completed" | "error" | "timeout";
  runId?: string;
  childSessionKey?: string; // e.g., "agent:main:subagent:abc123"
  parentSessionKey?: string; // The session that spawned this subagent
  startedAt: number;
  completedAt?: number;
  error?: string;
};

export type ChatStatus = "idle" | "streaming" | "submitted" | "error";

export function useGateway(url: string, token?: string, password?: string) {
  const clientRef = useRef<GatewayClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [hello, setHello] = useState<GatewayHelloOk | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventHandlersRef = useRef<Map<string, Set<(evt: GatewayEventFrame) => void>>>(new Map());

  const subscribe = useCallback((event: string, handler: (evt: GatewayEventFrame) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
    return () => {
      eventHandlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    // Don't connect if URL is empty
    if (!url) {
      setConnected(false);
      return;
    }

    // Clear previous error when attempting new connection
    setConnectionError(null);

    const client = new GatewayClient({
      url,
      token,
      password,
      onHello: (h) => {
        setConnected(true);
        setConnectionError(null);
        setHello(h);
      },
      onEvent: (evt) => {
        const handlers = eventHandlersRef.current.get(evt.event);
        if (handlers) {
          for (const handler of handlers) {
            handler(evt);
          }
        }
        // Also broadcast to "*" handlers
        const wildcardHandlers = eventHandlersRef.current.get("*");
        if (wildcardHandlers) {
          for (const handler of wildcardHandlers) {
            handler(evt);
          }
        }
      },
      onClose: () => {
        setConnected(false);
      },
      onReconnect: () => {},
      onConnectError: (err) => {
        setConnectionError(err);
      },
    });

    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, [url, token, password]);

  // eslint-disable-next-line react-hooks/refs
  return {
    client: clientRef.current,
    connected,
    hello,
    subscribe,
    connectionError,
  };
}

/**
 * Normalize role string to valid ChatMessage role.
 */
function normalizeRole(role: string): "user" | "assistant" {
  if (role === "user") return "user";
  return "assistant"; // Default to assistant for tool, system, etc.
}

/**
 * Convert MessagePart to StoredMessagePart for persistence.
 * Stringifies result to avoid localStorage bloat from large objects.
 */
function toStoredPart(part: MessagePart): StoredMessagePart {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "reasoning":
      return { type: "reasoning", text: part.text };
    case "tool-call":
      return {
        type: "tool-call",
        toolCallId: part.toolCallId,
        name: part.name,
        args: part.args,
      };
    case "tool-result":
      return {
        type: "tool-result",
        toolCallId: part.toolCallId,
        name: part.name,
        result: part.result !== undefined
          ? (typeof part.result === "string" ? part.result : JSON.stringify(part.result))
          : undefined,
        isError: part.isError,
      };
  }
}

/**
 * Parse a message from gateway history into ChatMessage format.
 * Handles both legacy string content and new structured block arrays.
 *
 * Gateway content block types:
 * - { type: "text", text: string }
 * - { type: "tool_use", id: string, name: string, input: unknown }
 * - { type: "tool_result", tool_use_id: string, content: string, is_error?: boolean }
 * - { type: "thinking", thinking: string }
 */
function parseHistoryMessage(msg: unknown, index: number): ChatMessage {
  const m = msg as Record<string, unknown>;
  const content = m.content;
  const parts: MessagePart[] = [];
  let textContent = "";

  if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as Record<string, unknown>;
      const blockType = String(b.type ?? "").toLowerCase();

      switch (blockType) {
        case "text":
          if (typeof b.text === "string") {
            parts.push({ type: "text", text: b.text });
            textContent += b.text;
          }
          break;

        case "tool_use":
          parts.push({
            type: "tool-call",
            toolCallId: String(b.id ?? ""),
            name: String(b.name ?? "tool"),
            args: b.input,
          });
          break;

        case "tool_result":
          parts.push({
            type: "tool-result",
            toolCallId: String(b.tool_use_id ?? ""),
            name: String(b.name ?? "tool"),
            result: typeof b.content === "string" ? b.content : JSON.stringify(b.content),
            isError: b.is_error === true,
          });
          break;

        case "thinking":
          parts.push({
            type: "reasoning",
            text: String(b.thinking ?? ""),
          });
          break;
      }
    }
  } else if (typeof content === "string") {
    // Legacy: plain string content
    parts.push({ type: "text", text: content });
    textContent = content;
  }

  return {
    id: String(m.id ?? `history-${index}-${Date.now()}`),
    role: normalizeRole(String(m.role ?? "assistant")),
    content: textContent,
    parts: parts.length > 0 ? parts : undefined,
    timestamp: typeof m.timestamp === "number" ? m.timestamp : Date.now(),
  };
}

/**
 * Extract parts from a message payload (used for final/aborted events).
 * Returns undefined if content is not structured.
 */
function extractParts(message: unknown): MessagePart[] | undefined {
  if (!message || typeof message !== "object") return undefined;

  const msg = message as Record<string, unknown>;
  const content = msg.content;

  if (!Array.isArray(content)) return undefined;

  const parts: MessagePart[] = [];

  for (const block of content) {
    const b = block as Record<string, unknown>;
    const blockType = String(b.type ?? "").toLowerCase();

    switch (blockType) {
      case "text":
        if (typeof b.text === "string") {
          parts.push({ type: "text", text: b.text });
        }
        break;

      case "tool_use":
        parts.push({
          type: "tool-call",
          toolCallId: String(b.id ?? ""),
          name: String(b.name ?? "tool"),
          args: b.input,
        });
        break;

      case "tool_result":
        parts.push({
          type: "tool-result",
          toolCallId: String(b.tool_use_id ?? ""),
          name: String(b.name ?? "tool"),
          result: typeof b.content === "string" ? b.content : JSON.stringify(b.content),
          isError: b.is_error === true,
        });
        break;

      case "thinking":
        parts.push({
          type: "reasoning",
          text: String(b.thinking ?? ""),
        });
        break;
    }
  }

  return parts.length > 0 ? parts : undefined;
}

/**
 * Model context window limits (in tokens).
 * Used as fallback when gateway doesn't provide contextTokens.
 */
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Claude models
  "claude-opus-4": 200_000,
  "claude-sonnet-4": 200_000,
  "claude-3-opus": 200_000,
  "claude-3-sonnet": 200_000,
  "claude-3-haiku": 200_000,
  "claude-3.5-sonnet": 200_000,
  "claude-3.5-haiku": 200_000,
  // OpenAI models
  "gpt-4": 128_000,
  "gpt-4-turbo": 128_000,
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "o1": 128_000,
  "o1-mini": 128_000,
  "o1-preview": 128_000,
  "o3-mini": 200_000,
  // Default
  default: 128_000,
};

function getModelContextLimit(modelId?: string | null): number {
  if (!modelId) return MODEL_CONTEXT_LIMITS.default;
  
  // Normalize model ID (lowercase, remove provider prefix)
  const normalizedModel = modelId.toLowerCase().replace(/^(anthropic|openai|google|meta)\//, "");
  
  // Try exact match first
  if (MODEL_CONTEXT_LIMITS[normalizedModel]) {
    return MODEL_CONTEXT_LIMITS[normalizedModel];
  }
  
  // Try prefix match
  for (const [prefix, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (normalizedModel.startsWith(prefix)) {
      return limit;
    }
  }
  
  return MODEL_CONTEXT_LIMITS.default;
}

/**
 * Hook to track session stats (token usage, model info).
 * Polls the gateway periodically and on chat events.
 */
export function useSessionStats(
  client: GatewayClient | null,
  sessionKey: string,
  subscribe: (event: string, handler: (evt: GatewayEventFrame) => void) => () => void
) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionKeyRef = useRef(sessionKey);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
  }, [sessionKey]);

  const fetchStats = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const result = await client.getSessionStats(sessionKeyRef.current);
      setStats(result);
    } catch (err) {
      console.error("Failed to fetch session stats:", err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Fetch stats on mount and when session changes
  useEffect(() => {
    setStats(null);
    fetchStats();
  }, [fetchStats, sessionKey]);

  // Refresh stats when chat events occur (final state)
  useEffect(() => {
    const unsub = subscribe("chat", (evt) => {
      const payload = evt.payload as {
        state?: string;
        sessionKey?: string;
      } | undefined;

      // Only refresh on final/aborted for our session
      if (
        payload?.sessionKey === sessionKeyRef.current &&
        (payload?.state === "final" || payload?.state === "aborted")
      ) {
        // Small delay to let gateway update stats
        setTimeout(() => fetchStats(), 200);
      }
    });

    return unsub;
  }, [subscribe, fetchStats]);

  const usedTokens = stats?.totalTokens ?? 0;
  const maxTokens = stats?.contextTokens ?? getModelContextLimit(stats?.model);

  return {
    stats,
    loading,
    refresh: fetchStats,
    usedTokens,
    maxTokens,
    modelId: stats?.model ?? null,
    usage: {
      inputTokens: stats?.inputTokens ?? 0,
      outputTokens: stats?.outputTokens ?? 0,
      totalTokens: (stats?.inputTokens ?? 0) + (stats?.outputTokens ?? 0),
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: stats?.outputTokens ?? 0,
        reasoningTokens: undefined,
      },
    },
  };
}

export function useOpenClawChat(
  client: GatewayClient | null,
  sessionKey: string = "agent:main:main",
  subscribe: (event: string, handler: (evt: GatewayEventFrame) => void) => () => void,
  onMessageSent?: () => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track history loading state for smoother transitions
  const [historyLoading, setHistoryLoading] = useState(false);

  // Live tool executions (ephemeral, not persisted)
  const [toolExecutions, setToolExecutions] = useState<Map<string, ToolExecutionState>>(
    new Map()
  );

  // Subagent tracking (ephemeral, tracked via sessions_spawn tool calls)
  const [subagents, setSubagents] = useState<Map<string, SubagentState>>(new Map());

  // Use refs to avoid stale closures in event handlers
  const streamingContentRef = useRef<string>("");
  const sessionKeyRef = useRef<string>(sessionKey);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Keep refs in sync
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
  }, [sessionKey]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load history on mount and when session changes
  useEffect(() => {
    // Clear current state when session changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setStreamingContent("");
    streamingContentRef.current = "";
    setStatus("idle");
    setCurrentRunId(null);
    setError(null);
    setHistoryLoading(true);

    // First, load from local storage (instant)
    const localMessages = getLocalMessages(sessionKey);
    if (localMessages.length > 0) {
      const mapped: ChatMessage[] = localMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts: msg.parts,
        timestamp: msg.timestamp,
      }));
      setMessages(mapped);
      // Local messages loaded, can show them while gateway loads
      setHistoryLoading(false);
    }

    // Then try to load from gateway (if available) and merge
    if (client) {
      client.loadHistory(sessionKey, 100)
        .then((result) => {
          const history = (result.messages ?? []) as unknown[];

          if (history.length > 0) {
            // Parse structured content blocks from gateway history
            const mapped: ChatMessage[] = history.map((msg, i) =>
              parseHistoryMessage(msg, i)
            );

            // Use gateway history if it has more messages, otherwise keep local
            if (mapped.length >= localMessages.length) {
              setMessages(mapped);
              // Sync to local storage (include parts for persistence)
              const toStore: StoredMessage[] = mapped.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                parts: m.parts?.map(toStoredPart),
                timestamp: m.timestamp ?? Date.now(),
              }));
              saveLocalMessages(sessionKey, toStore);
            }
          }

          // Enable verbose mode for live tool events
          return client.setVerboseLevel(sessionKey, "on");
        })
        .catch(() => {
          // Gateway history failed, keep local messages
          // Also try to enable verbose mode anyway
          client.setVerboseLevel(sessionKey, "on").catch(() => {});
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    } else {
      // No client, finish loading
      setHistoryLoading(false);
    }
  }, [client, sessionKey]);

  // Extract text from message content (handles various formats)
  const extractText = (message: unknown): string => {
    if (!message) return "";
    if (typeof message === "string") return message;
    
    const msg = message as Record<string, unknown>;
    
    // Handle content array format
    if (Array.isArray(msg.content)) {
      return msg.content
        .map((block: unknown) => {
          if (typeof block === "string") return block;
          const b = block as Record<string, unknown>;
          if (b.type === "text" && typeof b.text === "string") return b.text;
          return "";
        })
        .join("");
    }
    
    // Handle direct text/content
    if (typeof msg.content === "string") return msg.content;
    if (typeof msg.text === "string") return msg.text;
    
    return "";
  };

  // Subscribe to chat events
  useEffect(() => {
    const unsubscribe = subscribe("chat", (evt) => {
      const payload = evt.payload as {
        state?: "delta" | "final" | "aborted" | "error";
        runId?: string;
        sessionKey?: string;
        message?: unknown;
        errorMessage?: string;
      } | undefined;
      
      if (!payload) return;
      
      // Only handle events for our session (use ref to avoid stale closure)
      if (payload.sessionKey && payload.sessionKey !== sessionKeyRef.current) return;

      switch (payload.state) {
        case "delta":
          setStatus("streaming");
          const deltaText = extractText(payload.message);
          if (deltaText) {
            setStreamingContent(deltaText);
            streamingContentRef.current = deltaText;
          }
          break;

        case "final":
          // Finalize the streaming message (use ref to get latest streaming content)
          const finalText = streamingContentRef.current || extractText(payload.message);
          // Extract structured parts from final message
          const finalParts = extractParts(payload.message);

          if (finalText || finalParts) {
            const assistantMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: finalText,
              parts: finalParts,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            // Persist to local storage (include parts)
            addLocalMessage(sessionKeyRef.current, {
              id: assistantMsg.id,
              role: assistantMsg.role,
              content: assistantMsg.content,
              parts: finalParts?.map(toStoredPart),
              timestamp: assistantMsg.timestamp!,
            });
            // Notify parent that a message was completed (for sidebar refresh)
            onMessageSent?.();

            // Check if this is a subagent announce (contains sessionKey pattern)
            const announceMatch = finalText.match(/sessionKey:\s*(agent:\w+:subagent:[\w-]+)/i);
            if (announceMatch) {
              const childKey = announceMatch[1];
              setSubagents((prev) => {
                const next = new Map(prev);
                for (const [id, sub] of next) {
                  if (sub.childSessionKey === childKey && sub.status === "running") {
                    const isError = /Status:\s*error/i.test(finalText);
                    const isTimeout = /Status:\s*timeout/i.test(finalText);
                    next.set(id, {
                      ...sub,
                      status: isError ? "error" : isTimeout ? "timeout" : "completed",
                      completedAt: Date.now(),
                    });
                    break;
                  }
                }
                return next;
              });
            }
          }
          setStreamingContent("");
          streamingContentRef.current = "";
          setStatus("idle");
          setCurrentRunId(null);
          break;

        case "aborted":
          // Keep partial content if any (use ref)
          const abortedContent = streamingContentRef.current;
          // Try to extract parts from aborted message
          const abortedParts = extractParts(payload.message);

          if (abortedContent || abortedParts) {
            const abortedMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: abortedContent ? abortedContent + "\n\n[Aborted]" : "[Aborted]",
              parts: abortedParts,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, abortedMsg]);
            // Persist to local storage (include parts if available)
            addLocalMessage(sessionKeyRef.current, {
              id: abortedMsg.id,
              role: abortedMsg.role,
              content: abortedMsg.content,
              parts: abortedParts?.map(toStoredPart),
              timestamp: abortedMsg.timestamp!,
            });
          }
          setStreamingContent("");
          streamingContentRef.current = "";
          setStatus("idle");
          setCurrentRunId(null);
          break;

        case "error":
          setError(payload.errorMessage ?? "Unknown error");
          setStreamingContent("");
          streamingContentRef.current = "";
          setStatus("error");
          setCurrentRunId(null);
          break;
      }
    });

    return unsubscribe;
  }, [subscribe]); // Removed sessionKey and streamingContent from deps - using refs instead

  // ============================================================================
  // STREAM 2: Agent Events (structured tool/lifecycle data)
  // ============================================================================
  useEffect(() => {
    const unsub = subscribe("agent", (evt) => {
      const payload = evt.payload as {
        sessionKey?: string;
        stream?: string;
        data?: {
          phase?: string;
          name?: string;
          toolCallId?: string;
          meta?: string;
          args?: unknown;
          result?: unknown;
          isError?: boolean;
        };
      };

      // Filter to our session only
      if (!payload || payload.sessionKey !== sessionKeyRef.current) return;

      // Only handle tool stream events
      if (payload.stream !== "tool" || !payload.data) return;

      const { phase, name, toolCallId, meta, args, result, isError } = payload.data;
      if (!toolCallId) return;

      setToolExecutions((prev) => {
        const next = new Map(prev);

        if (phase === "start") {
          next.set(toolCallId, {
            toolCallId,
            name: name ?? "tool",
            phase: "executing",
            meta,
            args,
            startedAt: Date.now(),
          });
        } else if (phase === "result") {
          const existing = next.get(toolCallId);
          next.set(toolCallId, {
            toolCallId,
            name: name ?? existing?.name ?? "tool",
            phase: isError ? "error" : "result",
            meta: meta ?? existing?.meta,
            args: existing?.args,
            result,
            isError,
            startedAt: existing?.startedAt ?? Date.now(),
          });
        }

        return next;
      });

      // Track sessions_spawn calls as subagents
      if (name === "sessions_spawn") {
        const spawnArgs = args as { task?: string; label?: string; model?: string } | undefined;

        if (phase === "start") {
          setSubagents((prev) => {
            const next = new Map(prev);
            next.set(toolCallId, {
              toolCallId,
              task: spawnArgs?.task ?? "Background task",
              label: spawnArgs?.label,
              model: spawnArgs?.model,
              status: "spawning",
              parentSessionKey: sessionKeyRef.current, // Track which session spawned this
              startedAt: Date.now(),
            });
            return next;
          });
        } else if (phase === "result") {
          const spawnResult = result as {
            status?: string;
            runId?: string;
            childSessionKey?: string;
            error?: string;
          } | undefined;

          setSubagents((prev) => {
            const next = new Map(prev);
            const existing = next.get(toolCallId);
            if (existing) {
              next.set(toolCallId, {
                ...existing,
                status: spawnResult?.status === "accepted" ? "running" : "error",
                runId: spawnResult?.runId,
                childSessionKey: spawnResult?.childSessionKey,
                error: spawnResult?.error,
              });
            }
            return next;
          });
        }
      }
    });

    return unsub;
  }, [subscribe]);

  // ============================================================================
  // PERSISTENCE-AWARE CLEANUP
  // Remove tool from toolExecutions ONLY when it appears in message.parts
  // ============================================================================
  useEffect(() => {
    // Find the latest assistant message with parts
    const latestAssistantMsg = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "assistant" && m.parts?.length);

    if (!latestAssistantMsg?.parts) return;

    // Collect all tool IDs that are now persisted
    const persistedToolIds = new Set(
      latestAssistantMsg.parts
        .filter((p) => p.type === "tool-call" || p.type === "tool-result")
        .map((p) => (p as { toolCallId: string }).toolCallId)
    );

    if (persistedToolIds.size === 0) return;

    // Remove from toolExecutions only when the tool appears in persisted parts
    setToolExecutions((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const id of prev.keys()) {
        if (persistedToolIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [messages]); // Re-run when messages update

  // Fallback cleanup: Clear toolExecutions when generation completes
  // This handles cases where the final message has no structured parts
  useEffect(() => {
    if (status === "idle" && toolExecutions.size > 0) {
      // Check if the latest assistant message exists
      const latestAssistant = messagesRef.current
        .slice()
        .reverse()
        .find((m) => m.role === "assistant");

      if (latestAssistant) {
        // If message has parts, the main cleanup effect handles it
        // If not, we should still clear stale tool executions after a brief delay
        // to allow the persistence-aware cleanup to run first
        const timer = setTimeout(() => {
          setToolExecutions((prev) => {
            if (prev.size === 0) return prev;
            // Only clear if all tools have completed (phase !== "executing")
            const hasExecuting = Array.from(prev.values()).some(
              (t) => t.phase === "executing"
            );
            if (hasExecuting) return prev;
            return new Map();
          });
        }, 500); // Small delay to let parts-based cleanup run first

        return () => clearTimeout(timer);
      }
    }
  }, [status, toolExecutions.size]);

  // Clear toolExecutions and subagents when session changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToolExecutions(new Map());
    setSubagents(new Map());
  }, [sessionKey]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!client || !content.trim()) return;

      // Generate a local run ID for tracking
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Persist user message to local storage
      addLocalMessage(sessionKey, {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp!,
      });

      setStatus("submitted");
      setError(null);
      setCurrentRunId(runId);

      try {
        await client.sendChat(content, sessionKey, runId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setStatus("error");
        setCurrentRunId(null);
      }
    },
    [client, sessionKey]
  );

  const abort = useCallback(async () => {
    if (!client) return;
    try {
      await client.abortChat(sessionKeyRef.current, currentRunId ?? undefined);
      setStreamingContent("");
      streamingContentRef.current = "";
      setStatus("idle");
      setCurrentRunId(null);
    } catch (err) {
      console.error("Failed to abort:", err);
    }
  }, [client, currentRunId]);

  const regenerate = useCallback(async () => {
    if (!client || messages.length === 0) return;
    
    // Find the last user message
    const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const lastUserMessage = messages[lastUserIdx];
    
    // Remove messages after (and including) the last assistant response
    setMessages((prev) => prev.slice(0, lastUserIdx + 1));
    
    // Generate a new run ID
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Resend the last user message
    setStatus("submitted");
    setCurrentRunId(runId);
    try {
      await client.sendChat(lastUserMessage.content, sessionKey, runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
      setStatus("error");
      setCurrentRunId(null);
    }
  }, [client, messages, sessionKey]);

  const stopSubagent = useCallback(async (childSessionKey: string) => {
    if (!client) return;
    try {
      // Send /stop to the subagent session
      await client.sendChat("/stop", childSessionKey);
      // Update local state
      setSubagents((prev) => {
        const next = new Map(prev);
        for (const [id, sub] of next) {
          if (sub.childSessionKey === childSessionKey) {
            next.set(id, { ...sub, status: "error", error: "Stopped by user", completedAt: Date.now() });
            break;
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to stop subagent:", err);
    }
  }, [client]);

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
  };
}
