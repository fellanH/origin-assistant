/**
 * Storage utilities for Cortana UI
 * Compatible with OpenClaw control UI settings
 */

const STORAGE_KEY = "openclaw.control.settings.v1";
const CORTANA_KEY = "cortana.settings.v1";

export type CortanaSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  theme: "light" | "dark" | "system";
};

function getDefaultGatewayUrl(): string {
  if (typeof window === "undefined") return "ws://127.0.0.1:18789";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  // If we're on the gateway's port, use same host
  // Otherwise default to gateway port 18789
  const port = window.location.port === "18789" ? "" : ":18789";
  return `${proto}://${window.location.hostname}${port}`;
}

export function loadSettings(): CortanaSettings {
  const defaults: CortanaSettings = {
    gatewayUrl: getDefaultGatewayUrl(),
    token: "",
    sessionKey: "agent:main:main",
    theme: "dark",
  };

  if (typeof window === "undefined") return defaults;

  // Check URL params first (highest priority)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  const urlSession = params.get("session");
  const urlGateway = params.get("gateway");

  // Try to load from Cortana settings
  try {
    const raw = localStorage.getItem(CORTANA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CortanaSettings>;
      return {
        gatewayUrl: urlGateway || parsed.gatewayUrl || defaults.gatewayUrl,
        token: urlToken || parsed.token || defaults.token,
        sessionKey: urlSession || parsed.sessionKey || defaults.sessionKey,
        theme: parsed.theme || defaults.theme,
      };
    }
  } catch {
    // Ignore parse errors
  }

  // Fall back to OpenClaw control UI settings (for token sharing)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        gatewayUrl: urlGateway || (typeof parsed.gatewayUrl === "string" ? parsed.gatewayUrl : defaults.gatewayUrl),
        token: urlToken || (typeof parsed.token === "string" ? parsed.token : defaults.token),
        sessionKey: urlSession || (typeof parsed.sessionKey === "string" ? `agent:main:${parsed.sessionKey}` : defaults.sessionKey),
        theme: defaults.theme,
      };
    }
  } catch {
    // Ignore parse errors
  }

  // Apply URL overrides to defaults
  return {
    ...defaults,
    gatewayUrl: urlGateway || defaults.gatewayUrl,
    token: urlToken || defaults.token,
    sessionKey: urlSession || defaults.sessionKey,
  };
}

export function saveSettings(settings: Partial<CortanaSettings>): void {
  if (typeof window === "undefined") return;
  
  try {
    const current = loadSettings();
    const next = { ...current, ...settings };
    localStorage.setItem(CORTANA_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CORTANA_KEY);
}

// ============================================================================
// Session & Message Storage
// ============================================================================

const SESSIONS_KEY = "cortana.sessions.v1";
const MESSAGES_PREFIX = "cortana.messages.";

export type StoredMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCallId: string; name: string; args?: unknown }
  | { type: "tool-result"; toolCallId: string; name: string; result?: string; isError?: boolean };

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: StoredMessagePart[];
  timestamp: number;
};

export type StoredSession = {
  key: string;
  label: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
};

/**
 * Get all locally stored sessions
 */
export function getLocalSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as StoredSession[];
    // Sort by last message time (most recent first)
    return sessions.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  } catch {
    return [];
  }
}

/**
 * Save or update a session in local storage
 */
export function saveLocalSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getLocalSessions();
    const existingIdx = sessions.findIndex((s) => s.key === session.key);
    if (existingIdx >= 0) {
      sessions[existingIdx] = session;
    } else {
      sessions.unshift(session);
    }
    // Keep only last 100 sessions
    const trimmed = sessions.slice(0, 100);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Delete a session and its messages from local storage
 */
export function deleteLocalSession(sessionKey: string): void {
  if (typeof window === "undefined") return;
  try {
    // Remove from sessions list
    const sessions = getLocalSessions().filter((s) => s.key !== sessionKey);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    // Remove messages
    localStorage.removeItem(MESSAGES_PREFIX + sessionKey);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get messages for a specific session
 */
export function getLocalMessages(sessionKey: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_PREFIX + sessionKey);
    if (!raw) return [];
    return JSON.parse(raw) as StoredMessage[];
  } catch {
    return [];
  }
}

/**
 * Save messages for a session (replaces all messages)
 */
export function saveLocalMessages(sessionKey: string, messages: StoredMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MESSAGES_PREFIX + sessionKey, JSON.stringify(messages));

    // Also update the session metadata
    const sessions = getLocalSessions();
    const session = sessions.find((s) => s.key === sessionKey);
    if (session) {
      session.messageCount = messages.length;
      session.lastMessageAt = messages.length > 0
        ? messages[messages.length - 1].timestamp
        : session.lastMessageAt;
      saveLocalSession(session);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add a single message to a session's history
 */
export function addLocalMessage(sessionKey: string, message: StoredMessage): void {
  if (typeof window === "undefined") return;
  try {
    const messages = getLocalMessages(sessionKey);
    messages.push(message);
    // Keep only last 500 messages per session
    const trimmed = messages.slice(-500);
    localStorage.setItem(MESSAGES_PREFIX + sessionKey, JSON.stringify(trimmed));

    // Update session metadata
    const sessions = getLocalSessions();
    let session = sessions.find((s) => s.key === sessionKey);
    if (!session) {
      // Create new session entry
      session = {
        key: sessionKey,
        label: generateSessionLabel(sessionKey, message.content),
        createdAt: message.timestamp,
        lastMessageAt: message.timestamp,
        messageCount: 1,
      };
    } else {
      session.lastMessageAt = message.timestamp;
      session.messageCount = trimmed.length;
      // Update label from first user message if it's generic
      if (session.label.startsWith("Session ") && message.role === "user" && trimmed.length <= 2) {
        session.label = generateSessionLabel(sessionKey, message.content);
      }
    }
    saveLocalSession(session);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate a session label from the first message
 */
function generateSessionLabel(sessionKey: string, firstMessage?: string): string {
  if (firstMessage) {
    // Use first ~40 chars of the message as the label
    const cleaned = firstMessage.replace(/\s+/g, " ").trim();
    if (cleaned.length > 40) {
      return cleaned.slice(0, 40) + "…";
    }
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  // Fallback to session key parsing
  const parts = sessionKey.split(":");
  if (parts.length >= 3) {
    const sessionId = parts[2];
    if (sessionId === "main") return "Main Session";
    return `Session ${sessionId.slice(0, 6)}`;
  }
  return `Session ${sessionKey.slice(0, 6)}`;
}

/**
 * Create a new session entry without messages
 */
export function createLocalSession(sessionKey: string, label?: string): StoredSession {
  const session: StoredSession = {
    key: sessionKey,
    label: label || generateSessionLabel(sessionKey),
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    messageCount: 0,
  };
  saveLocalSession(session);
  return session;
}
