"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { GatewayClient, GatewayEventFrame } from "./gateway";
import {
  getLocalMessages,
  getLocalSessions,
  addLocalMessage,
  saveLocalMessages,
  updateSessionLabel,
  isGenericSessionLabel,
  generateLabelFromContent,
  type StoredMessage,
  type StoredMessagePart,
} from "./storage";

// =============================================================================
// TYPES
// =============================================================================

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCallId: string; name: string; args?: unknown }
  | { type: "tool-result"; toolCallId: string; name: string; result?: unknown; isError?: boolean }
  | {
      type: "subagent";
      toolCallId: string;
      task: string;
      label?: string;
      model?: string;
      status: "completed" | "error" | "timeout";
      duration: number;
      resultSummary?: string;
      childSessionKey?: string;
    };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: MessagePart[];
  timestamp?: number;
};

export type ToolExecutionState = {
  toolCallId: string;
  name: string;
  phase: "executing" | "result" | "error";
  meta?: string;
  args?: unknown;
  result?: unknown;
  isError?: boolean;
  startedAt: number;
};

export type SubagentState = {
  toolCallId: string;
  task: string;
  label?: string;
  model?: string;
  status: "spawning" | "running" | "completed" | "error" | "timeout";
  runId?: string;
  childSessionKey?: string;
  parentSessionKey?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
  resultSummary?: string;
  currentTool?: { name: string; phase: "executing" | "result"; startedAt: number };
  toolCount?: number;
  lastActivity?: number;
};

export type ChatStatus = "idle" | "streaming" | "submitted" | "error";

/**
 * State for a single session
 */
export interface SessionData {
  key: string;
  messages: ChatMessage[];
  status: ChatStatus;
  streamingContent: string;
  currentRunId: string | null;
  error: string | null;
  historyLoaded: boolean;
  historyLoading: boolean;
  toolExecutions: Map<string, ToolExecutionState>;
  subagents: Map<string, SubagentState>;
  messageQueue: string[];
  eventQueue: GatewayEventFrame[]; // Buffer for race condition fix
  persistedSubagentIds: Set<string>;
  lastAccess: number; // For LRU eviction
}

/**
 * Create empty session data
 */
function createEmptySession(key: string): SessionData {
  return {
    key,
    messages: [],
    status: "idle",
    streamingContent: "",
    currentRunId: null,
    error: null,
    historyLoaded: false,
    historyLoading: false,
    toolExecutions: new Map(),
    subagents: new Map(),
    messageQueue: [],
    eventQueue: [],
    persistedSubagentIds: new Set(),
    lastAccess: Date.now(),
  };
}

// =============================================================================
// STORE
// =============================================================================

interface SessionStore {
  // Session cache
  sessions: Map<string, SessionData>;
  
  // Config
  maxCachedSessions: number;
  
  // Actions
  getOrCreateSession: (key: string) => SessionData;
  updateSession: (key: string, updater: (session: SessionData) => Partial<SessionData>) => void;
  
  // History loading
  loadSessionHistory: (key: string, client: GatewayClient) => Promise<void>;
  
  // Event processing (called from WebSocket handlers)
  processChatEvent: (event: GatewayEventFrame) => void;
  processAgentEvent: (event: GatewayEventFrame) => void;
  
  // Message sending
  sendMessage: (key: string, content: string, client: GatewayClient) => Promise<void>;
  abort: (key: string, client: GatewayClient) => Promise<void>;
  
  // Cache management
  evictSession: (key: string) => void;
  evictLRU: () => void;
  touchSession: (key: string) => void;
  clearAllSessions: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeRole(role: string): "user" | "assistant" {
  return role === "user" ? "user" : "assistant";
}

function toStoredPart(part: MessagePart): StoredMessagePart {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "reasoning":
      return { type: "reasoning", text: part.text };
    case "tool-call":
      return { type: "tool-call", toolCallId: part.toolCallId, name: part.name, args: part.args };
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
    case "subagent":
      return {
        type: "subagent",
        toolCallId: part.toolCallId,
        task: part.task,
        label: part.label,
        model: part.model,
        status: part.status,
        duration: part.duration,
        resultSummary: part.resultSummary,
        childSessionKey: part.childSessionKey,
      };
  }
}

function parseHistoryMessage(msg: unknown, index: number): ChatMessage {
  const m = msg as Record<string, unknown>;
  const content = m.content;
  const parts: MessagePart[] = [];
  let textContent = "";

  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
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
          parts.push({ type: "reasoning", text: String(b.thinking ?? "") });
          break;
        case "subagent":
          parts.push({
            type: "subagent",
            toolCallId: String(b.toolCallId ?? ""),
            task: String(b.task ?? ""),
            label: typeof b.label === "string" ? b.label : undefined,
            model: typeof b.model === "string" ? b.model : undefined,
            status: (b.status === "completed" || b.status === "error" || b.status === "timeout")
              ? b.status : "completed",
            duration: typeof b.duration === "number" ? b.duration : 0,
            resultSummary: typeof b.resultSummary === "string" ? b.resultSummary : undefined,
            childSessionKey: typeof b.childSessionKey === "string" ? b.childSessionKey : undefined,
          });
          break;
      }
    }
  } else if (typeof content === "string") {
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

function extractText(message: unknown): string {
  if (!message) return "";
  if (typeof message === "string") return message;
  
  const msg = message as Record<string, unknown>;
  
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block: unknown) => {
        if (typeof block !== "object" || block === null) return "";
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") return b.text;
        return "";
      })
      .join("");
  }
  
  if (typeof msg.content === "string") return msg.content;
  if (typeof msg.text === "string") return msg.text;
  
  return "";
}

function extractParts(message: unknown): MessagePart[] | undefined {
  if (!message || typeof message !== "object") return undefined;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (!Array.isArray(content)) return undefined;

  const parts: MessagePart[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;
    const blockType = String(b.type ?? "").toLowerCase();

    switch (blockType) {
      case "text":
        if (typeof b.text === "string") parts.push({ type: "text", text: b.text });
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
        parts.push({ type: "reasoning", text: String(b.thinking ?? "") });
        break;
    }
  }

  return parts.length > 0 ? parts : undefined;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set, get) => ({
    sessions: new Map(),
    maxCachedSessions: 10,

    getOrCreateSession: (key: string) => {
      const { sessions } = get();
      let session = sessions.get(key);
      if (!session) {
        session = createEmptySession(key);
        set({ sessions: new Map(sessions).set(key, session) });
      }
      return session;
    },

    updateSession: (key: string, updater: (session: SessionData) => Partial<SessionData>) => {
      set((state) => {
        const session = state.sessions.get(key);
        if (!session) return state;
        
        const updates = updater(session);
        const newSession = { ...session, ...updates, lastAccess: Date.now() };
        const newSessions = new Map(state.sessions);
        newSessions.set(key, newSession);
        
        return { sessions: newSessions };
      });
    },

    loadSessionHistory: async (key: string, client: GatewayClient) => {
      const { getOrCreateSession, updateSession, evictLRU } = get();
      
      // Ensure session exists
      getOrCreateSession(key);
      
      // Check if already loaded
      const session = get().sessions.get(key);
      if (session?.historyLoaded) {
        updateSession(key, () => ({ lastAccess: Date.now() }));
        return;
      }
      
      // Mark as loading
      updateSession(key, () => ({
        historyLoading: true,
        eventQueue: [], // Clear stale events
      }));
      
      // Load from localStorage first (instant)
      const localMessages = getLocalMessages(key);
      if (localMessages.length > 0) {
        const mapped: ChatMessage[] = localMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          parts: msg.parts,
          timestamp: msg.timestamp,
        }));
        updateSession(key, () => ({ messages: mapped }));
      }
      
      // Load from gateway
      try {
        const result = await client.loadHistory(key, 100);
        const history = (result.messages ?? []) as unknown[];
        
        if (history.length > 0) {
          const mapped = history.map((msg, i) => parseHistoryMessage(msg, i));
          
          if (mapped.length >= localMessages.length) {
            updateSession(key, () => ({ messages: mapped }));
            
            // Sync to localStorage
            const toStore: StoredMessage[] = mapped.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              parts: m.parts?.map(toStoredPart),
              timestamp: m.timestamp ?? Date.now(),
            }));
            saveLocalMessages(key, toStore);
          }
        }
        
        // Enable verbose mode
        await client.setVerboseLevel(key, "on").catch(() => {});
      } catch {
        // Keep local messages on failure
        client.setVerboseLevel(key, "on").catch(() => {});
      }
      
      // Mark as loaded and process queued events
      const currentSession = get().sessions.get(key);
      const queuedEvents = currentSession?.eventQueue ?? [];
      
      updateSession(key, () => ({
        historyLoading: false,
        historyLoaded: true,
        eventQueue: [],
      }));
      
      // Process queued events
      for (const evt of queuedEvents) {
        get().processChatEvent(evt);
      }
      
      // Evict old sessions if needed
      evictLRU();
    },

    processChatEvent: (event: GatewayEventFrame) => {
      const payload = event.payload as {
        state?: "delta" | "final" | "aborted" | "error";
        runId?: string;
        sessionKey?: string;
        message?: unknown;
        errorMessage?: string;
      } | undefined;
      
      if (!payload?.sessionKey) return;
      
      const key = payload.sessionKey;
      const { sessions, updateSession, getOrCreateSession } = get();
      
      // Get or create session
      let session = sessions.get(key);
      if (!session) {
        session = getOrCreateSession(key);
      }
      
      // Queue if still loading history
      if (session.historyLoading) {
        updateSession(key, (s) => ({
          eventQueue: [...s.eventQueue, event],
        }));
        return;
      }
      
      switch (payload.state) {
        case "delta": {
          const deltaText = extractText(payload.message);
          updateSession(key, () => ({
            status: "streaming",
            streamingContent: deltaText || undefined,
          }));
          break;
        }
        
        case "final": {
          const currentSession = get().sessions.get(key);
          const finalText = currentSession?.streamingContent || extractText(payload.message);
          const finalParts = extractParts(payload.message);
          
          if (finalText || finalParts) {
            const assistantMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: finalText,
              parts: finalParts,
              timestamp: Date.now(),
            };
            
            updateSession(key, (s) => ({
              messages: [...s.messages, assistantMsg],
              streamingContent: "",
              status: "idle",
              currentRunId: null,
            }));
            
            // Persist to localStorage
            addLocalMessage(key, {
              id: assistantMsg.id,
              role: assistantMsg.role,
              content: assistantMsg.content,
              parts: finalParts?.map(toStoredPart),
              timestamp: assistantMsg.timestamp!,
            });
            
            // Auto-name session
            const currentSess = getLocalSessions().find((s) => s.key === key);
            if (currentSess && isGenericSessionLabel(currentSess.label)) {
              const allMsgs = get().sessions.get(key)?.messages ?? [];
              const firstUser = allMsgs.find((m) => m.role === "user");
              if (firstUser?.content) {
                updateSessionLabel(key, generateLabelFromContent(firstUser.content));
              }
            }
            
            // Handle subagent completion
            const announceMatch = finalText.match(/sessionKey:\s*(agent:\w+:subagent:[\w-]+)/i);
            if (announceMatch) {
              const childKey = announceMatch[1];
              updateSession(key, (s) => {
                const next = new Map(s.subagents);
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
                return { subagents: next };
              });
            }
          } else {
            updateSession(key, () => ({
              streamingContent: "",
              status: "idle",
              currentRunId: null,
            }));
          }
          break;
        }
        
        case "aborted": {
          const currentSession = get().sessions.get(key);
          const abortedContent = currentSession?.streamingContent ?? "";
          const abortedParts = extractParts(payload.message);
          
          if (abortedContent || abortedParts) {
            const abortedMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: abortedContent ? abortedContent + "\n\n[Aborted]" : "[Aborted]",
              parts: abortedParts,
              timestamp: Date.now(),
            };
            
            updateSession(key, (s) => ({
              messages: [...s.messages, abortedMsg],
              streamingContent: "",
              status: "idle",
              currentRunId: null,
            }));
            
            addLocalMessage(key, {
              id: abortedMsg.id,
              role: abortedMsg.role,
              content: abortedMsg.content,
              parts: abortedParts?.map(toStoredPart),
              timestamp: abortedMsg.timestamp!,
            });
          } else {
            updateSession(key, () => ({
              streamingContent: "",
              status: "idle",
              currentRunId: null,
            }));
          }
          break;
        }
        
        case "error": {
          updateSession(key, () => ({
            error: payload.errorMessage ?? "Unknown error",
            streamingContent: "",
            status: "error",
            currentRunId: null,
          }));
          break;
        }
      }
    },

    processAgentEvent: (event: GatewayEventFrame) => {
      const payload = event.payload as {
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
      
      if (!payload?.sessionKey || payload.stream !== "tool" || !payload.data) return;
      
      const key = payload.sessionKey;
      const { phase, name, toolCallId, meta, args, result, isError } = payload.data;
      if (!toolCallId) return;
      
      const { updateSession, sessions } = get();
      
      // Update tool executions
      updateSession(key, (s) => {
        const next = new Map(s.toolExecutions);
        
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
        
        return { toolExecutions: next };
      });
      
      // Track sessions_spawn
      if (name === "sessions_spawn") {
        const spawnArgs = args as { task?: string; label?: string; model?: string } | undefined;
        
        if (phase === "start") {
          updateSession(key, (s) => {
            const next = new Map(s.subagents);
            next.set(toolCallId, {
              toolCallId,
              task: spawnArgs?.task ?? "Background task",
              label: spawnArgs?.label,
              model: spawnArgs?.model,
              status: "spawning",
              parentSessionKey: key,
              startedAt: Date.now(),
            });
            return { subagents: next };
          });
        } else if (phase === "result") {
          const spawnResult = result as {
            status?: string;
            runId?: string;
            childSessionKey?: string;
            error?: string;
          } | undefined;
          
          updateSession(key, (s) => {
            const next = new Map(s.subagents);
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
            return { subagents: next };
          });
        }
      }
      
      // Track child subagent activity
      const allSessions = sessions;
      for (const [parentKey, parentSession] of allSessions) {
        for (const [, sub] of parentSession.subagents) {
          if (sub.childSessionKey === key && sub.status === "running") {
            updateSession(parentKey, (s) => {
              const next = new Map(s.subagents);
              const existing = Array.from(next.entries()).find(
                ([, v]) => v.childSessionKey === key
              );
              if (existing) {
                const [subId, subData] = existing;
                if (phase === "start") {
                  next.set(subId, {
                    ...subData,
                    currentTool: { name: name ?? "tool", phase: "executing", startedAt: Date.now() },
                    toolCount: (subData.toolCount ?? 0) + 1,
                    lastActivity: Date.now(),
                  });
                } else if (phase === "result") {
                  next.set(subId, {
                    ...subData,
                    currentTool: undefined,
                    lastActivity: Date.now(),
                  });
                }
              }
              return { subagents: next };
            });
            break;
          }
        }
      }
    },

    sendMessage: async (key: string, content: string, client: GatewayClient) => {
      if (!content.trim()) return;
      
      const { updateSession, sessions } = get();
      const session = sessions.get(key);
      
      // Queue if busy
      if (session && session.status !== "idle") {
        updateSession(key, (s) => ({
          messageQueue: [...s.messageQueue, content.trim()],
        }));
        return;
      }
      
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      
      updateSession(key, (s) => ({
        messages: [...s.messages, userMessage],
        status: "submitted",
        error: null,
        currentRunId: runId,
      }));
      
      // Persist
      addLocalMessage(key, {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp!,
      });
      
      // Send
      try {
        await client.sendChat(content, key, runId);
      } catch (err) {
        updateSession(key, () => ({
          error: err instanceof Error ? err.message : "Failed to send",
          status: "error",
          currentRunId: null,
        }));
      }
    },

    abort: async (key: string, client: GatewayClient) => {
      const { sessions, updateSession } = get();
      const session = sessions.get(key);
      
      try {
        await client.abortChat(key, session?.currentRunId ?? undefined);
        updateSession(key, () => ({
          streamingContent: "",
          status: "idle",
          currentRunId: null,
        }));
      } catch (err) {
        console.error("Failed to abort:", err);
      }
    },

    evictSession: (key: string) => {
      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.delete(key);
        return { sessions: newSessions };
      });
    },

    evictLRU: () => {
      const { sessions, maxCachedSessions, evictSession } = get();
      
      if (sessions.size <= maxCachedSessions) return;
      
      // Sort by lastAccess, evict oldest
      const sorted = Array.from(sessions.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      const toEvict = sorted.slice(0, sessions.size - maxCachedSessions);
      for (const [key] of toEvict) {
        evictSession(key);
      }
    },

    touchSession: (key: string) => {
      const { updateSession } = get();
      updateSession(key, () => ({ lastAccess: Date.now() }));
    },

    clearAllSessions: () => {
      set({ sessions: new Map() });
    },
  }))
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

/**
 * Get session data with automatic creation and caching
 */
export function useSession(key: string) {
  const session = useSessionStore((state) => state.sessions.get(key));
  const getOrCreate = useSessionStore((state) => state.getOrCreateSession);
  
  // Ensure session exists
  if (!session) {
    getOrCreate(key);
  }
  
  return session ?? createEmptySession(key);
}

/**
 * Get specific session field (optimized re-renders)
 */
export function useSessionField<T>(
  key: string,
  selector: (session: SessionData) => T
): T {
  return useSessionStore((state) => {
    const session = state.sessions.get(key);
    if (!session) return selector(createEmptySession(key));
    return selector(session);
  });
}
