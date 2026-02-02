/**
 * Storage utilities for Origin UI
 * Falls back to OpenClaw control UI settings for token sharing (legacy compatibility)
 */

// ============================================================================
// Session Update Events
// ============================================================================

type SessionUpdateListener = () => void;
const sessionUpdateListeners = new Set<SessionUpdateListener>();

/**
 * Subscribe to session updates (label changes, new sessions, etc.)
 * Returns an unsubscribe function.
 */
export function onSessionUpdate(listener: SessionUpdateListener): () => void {
	sessionUpdateListeners.add(listener);
	return () => {
		sessionUpdateListeners.delete(listener);
	};
}

/**
 * Notify all listeners that sessions have been updated.
 */
function notifySessionUpdate(): void {
	console.log("[storage] notifySessionUpdate called, listeners:", sessionUpdateListeners.size);
	for (const listener of sessionUpdateListeners) {
		try {
			listener();
		} catch (err) {
			console.error("[storage] Session update listener error:", err);
		}
	}
}

// ============================================================================
// Settings Storage
// ============================================================================

const OPENCLAW_LEGACY_KEY = "openclaw.control.settings.v1";
const ORIGIN_KEY = "origin.settings.v1";

export type OriginSettings = {
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

export function loadSettings(): OriginSettings {
	const defaults: OriginSettings = {
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

	// Try to load from Origin settings
	try {
		const raw = localStorage.getItem(ORIGIN_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<OriginSettings>;
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

	// Fall back to OpenClaw control UI settings (legacy token sharing)
	try {
		const raw = localStorage.getItem(OPENCLAW_LEGACY_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			return {
				gatewayUrl:
					urlGateway ||
					(typeof parsed.gatewayUrl === "string"
						? parsed.gatewayUrl
						: defaults.gatewayUrl),
				token:
					urlToken ||
					(typeof parsed.token === "string" ? parsed.token : defaults.token),
				sessionKey:
					urlSession ||
					(typeof parsed.sessionKey === "string"
						? `agent:main:${parsed.sessionKey}`
						: defaults.sessionKey),
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

export function saveSettings(settings: Partial<OriginSettings>): void {
	if (typeof window === "undefined") return;

	try {
		const current = loadSettings();
		const next = { ...current, ...settings };
		localStorage.setItem(ORIGIN_KEY, JSON.stringify(next));
	} catch {
		// Ignore storage errors
	}
}

export function clearSettings(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(ORIGIN_KEY);
}

// ============================================================================
// Session & Message Storage
// ============================================================================

const SESSIONS_KEY = "origin.sessions.v1";
const MESSAGES_PREFIX = "origin.messages.";
const HIDDEN_SESSIONS_KEY = "origin.hidden-sessions.v1";

export type StoredMessagePart =
	| { type: "text"; text: string }
	| { type: "reasoning"; text: string }
	| { type: "tool-call"; toolCallId: string; name: string; args?: unknown }
	| {
			type: "tool-result";
			toolCallId: string;
			name: string;
			result?: string;
			isError?: boolean;
	  }
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
 * Delete a session and its messages from local storage.
 * Also hides the session from gateway results.
 */
export function deleteLocalSession(sessionKey: string): void {
	if (typeof window === "undefined") return;
	try {
		// Remove from sessions list
		const sessions = getLocalSessions().filter((s) => s.key !== sessionKey);
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
		// Remove messages
		localStorage.removeItem(MESSAGES_PREFIX + sessionKey);
		// Also hide from gateway results
		hideSession(sessionKey);
	} catch {
		// Ignore storage errors
	}
}

/**
 * Get the set of hidden session keys (sessions deleted locally but may exist on gateway)
 */
export function getHiddenSessions(): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = localStorage.getItem(HIDDEN_SESSIONS_KEY);
		if (!raw) return new Set();
		return new Set(JSON.parse(raw) as string[]);
	} catch {
		return new Set();
	}
}

/**
 * Hide a session (used when deleting gateway-only sessions)
 */
export function hideSession(sessionKey: string): void {
	if (typeof window === "undefined") return;
	try {
		const hidden = getHiddenSessions();
		hidden.add(sessionKey);
		localStorage.setItem(HIDDEN_SESSIONS_KEY, JSON.stringify([...hidden]));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Unhide a session (used when user creates/interacts with a hidden session)
 */
export function unhideSession(sessionKey: string): void {
	if (typeof window === "undefined") return;
	try {
		const hidden = getHiddenSessions();
		if (hidden.delete(sessionKey)) {
			localStorage.setItem(HIDDEN_SESSIONS_KEY, JSON.stringify([...hidden]));
		}
	} catch {
		// Ignore storage errors
	}
}

/**
 * Clear all hidden sessions (useful for debugging)
 */
export function clearHiddenSessions(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(HIDDEN_SESSIONS_KEY);
}

/**
 * Clear a session's messages but keep the session entry
 */
export function clearLocalSession(sessionKey: string): void {
	if (typeof window === "undefined") return;
	try {
		// Clear messages but keep the session entry
		localStorage.removeItem(MESSAGES_PREFIX + sessionKey);

		// Update session metadata
		const sessions = getLocalSessions();
		const session = sessions.find((s) => s.key === sessionKey);
		if (session) {
			session.messageCount = 0;
			session.label = "New Chat"; // Reset to allow re-naming
			saveLocalSession(session);
		}
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
export function saveLocalMessages(
	sessionKey: string,
	messages: StoredMessage[],
): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(
			MESSAGES_PREFIX + sessionKey,
			JSON.stringify(messages),
		);

		// Also update the session metadata
		const sessions = getLocalSessions();
		const session = sessions.find((s) => s.key === sessionKey);
		if (session) {
			session.messageCount = messages.length;
			session.lastMessageAt =
				messages.length > 0
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
export function addLocalMessage(
	sessionKey: string,
	message: StoredMessage,
): void {
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
			if (
				session.label.startsWith("Session ") &&
				message.role === "user" &&
				trimmed.length <= 2
			) {
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
function generateSessionLabel(
	sessionKey: string,
	firstMessage?: string,
): string {
	if (firstMessage) {
		// Use first ~35 chars of the message as the label
		const cleaned = firstMessage.replace(/\s+/g, " ").trim();
		if (cleaned.length > 35) {
			return cleaned.slice(0, 35) + "…";
		}
		if (cleaned.length > 0) {
			return cleaned;
		}
	}

	// Fallback to session key parsing
	const parts = sessionKey.split(":");
	if (parts.length >= 3) {
		// All chat sessions: agent:main:<id> pattern
		if (parts[0] === "agent" && parts.length === 3) {
			return "Chat";
		}
		const sessionId = parts[2];
		return `Session ${sessionId.slice(0, 6)}`;
	}
	return `Session ${sessionKey.slice(0, 6)}`;
}

/**
 * Check if a session label is a generic/placeholder label
 */
export function isGenericSessionLabel(label: string): boolean {
	return (
		label === "Chat" ||
		label === "New Chat" ||
		label === "Main Session" ||
		label.startsWith("Session ")
	);
}

/**
 * Update just the label of an existing session
 */
export function updateSessionLabel(
	sessionKey: string,
	label: string,
): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		const sessions = getLocalSessions();
		const session = sessions.find((s) => s.key === sessionKey);
		if (session) {
			session.label = label;
			saveLocalSession(session);
			// Notify listeners (e.g., sidebar) to refresh
			notifySessionUpdate();
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Generate a label from message content (truncated to 35 chars with ellipsis)
 */
export function generateLabelFromContent(content: string): string {
	const cleaned = content.replace(/\s+/g, " ").trim();
	if (cleaned.length > 35) {
		return cleaned.slice(0, 35) + "…";
	}
	return cleaned || "New Chat";
}

/**
 * Create a new session entry without messages
 */
export function createLocalSession(
	sessionKey: string,
	label?: string,
): StoredSession {
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
