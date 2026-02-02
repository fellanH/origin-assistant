/**
 * Session utilities for hierarchical session tree
 */

// ============================================================================
// Types
// ============================================================================

export type ParsedSessionKey = {
  agentId: string;
  type: "subagent" | "channel" | "cron" | "hook" | "chat" | "other";
  channelType?: string;  // telegram, discord, etc.
  chatType?: string;     // group, channel, dm
  identifier: string;    // uuid, group id, etc.
  parentKey?: string;    // For subagents: the parent session key
};

export type Session = {
  key: string;
  label?: string;
  createdAt?: number;
  lastTurnAt?: number;
  reasoningLevel?: string;
  messageCount?: number;
  isLocal?: boolean;
  /** First user message preview (if available) */
  preview?: string;
};

export type SubagentMeta = {
  label?: string;
  task?: string;
  status?: "spawning" | "running" | "completed" | "error" | "timeout";
  duration?: number;
  model?: string;
  parentSessionKey?: string; // The session that spawned this subagent
};

export type SessionTreeNode = {
  session: Session;
  parsed: ParsedSessionKey;
  children: SessionTreeNode[];
  depth: number;
  subagentMeta?: SubagentMeta;
};

// ============================================================================
// Session Key Parser
// ============================================================================

export function parseSessionKey(key: string): ParsedSessionKey {
  const parts = key.split(":");
  
  // agent:main:<id> - all chat sessions (including "main" which is just another session)
  // These are individual chat sessions created via "New Session"
  if (parts[0] === "agent" && parts.length === 3 && parts[2] !== "subagent") {
    const identifier = parts[2];
    // Check if it looks like a session ID (alphanumeric, or "main")
    if (/^[a-z0-9]+$/i.test(identifier) && identifier.length <= 16) {
      return {
        agentId: parts[1],
        type: "chat",
        identifier,
      };
    }
  }
  
  // agent:main:subagent:uuid
  if (parts[0] === "agent" && parts.length >= 4 && parts[2] === "subagent") {
    return {
      agentId: parts[1],
      type: "subagent",
      identifier: parts[3],
      parentKey: `agent:${parts[1]}:main`, // Default parent is main
    };
  }
  
  // agent:main:telegram:group:12345 or agent:main:discord:channel:12345
  if (parts[0] === "agent" && parts.length >= 5) {
    return {
      agentId: parts[1],
      type: "channel",
      channelType: parts[2],
      chatType: parts[3],
      identifier: parts.slice(4).join(":"),
    };
  }
  
  // agent:cron:* - scheduled tasks
  if (parts[0] === "agent" && parts.length >= 3 && parts[1] === "cron") {
    return {
      agentId: "system",
      type: "cron",
      identifier: parts.slice(2).join(":"),
    };
  }
  
  // cron:jobId (legacy format)
  if (parts[0] === "cron") {
    return {
      agentId: "system",
      type: "cron",
      identifier: parts.slice(1).join(":"),
    };
  }
  
  // hook:hookId
  if (parts[0] === "hook") {
    return {
      agentId: "system",
      type: "hook",
      identifier: parts.slice(1).join(":"),
    };
  }
  
  return {
    agentId: "unknown",
    type: "other",
    identifier: key,
  };
}

// ============================================================================
// Display Helpers
// ============================================================================

export function getSessionIcon(parsed: ParsedSessionKey): string {
  switch (parsed.type) {
    case "chat": return "💬";
    case "subagent": return "⚡";
    case "channel": {
      switch (parsed.channelType) {
        case "telegram": return "📱";
        case "discord": return "🎮";
        case "slack": return "💼";
        case "whatsapp": return "📲";
        default: return "📢";
      }
    }
    case "cron": return "🔄";
    case "hook": return "🔗";
    default: return "📄";
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "…";
}

/**
 * Clean up a preview string for display.
 * Removes excessive whitespace, newlines, and common prefixes.
 */
function cleanPreview(text: string): string {
  return text
    .replace(/\s+/g, " ")     // Collapse whitespace
    .replace(/^(hi|hey|hello|yo)\s*[,!]?\s*/i, "") // Remove greetings
    .trim();
}

export function getSessionDisplayName(
  session: Session,
  parsed: ParsedSessionKey,
  subagentMeta?: SubagentMeta
): string {
  // Use explicit label if set
  if (session.label) return session.label;
  
  switch (parsed.type) {
    case "chat": {
      // For chat sessions, prefer preview (first message) if available
      if (session.preview) {
        const cleaned = cleanPreview(session.preview);
        if (cleaned) return truncate(cleaned, 32);
      }
      // Fallback to a friendly name
      return "Chat";
    }
    
    case "subagent": {
      // Use subagent label/task if available
      if (subagentMeta?.label) return subagentMeta.label;
      if (subagentMeta?.task) return truncate(subagentMeta.task, 28);
      // Fallback
      return "Background Task";
    }
    
    case "channel": {
      const platform = capitalize(parsed.channelType || "channel");
      const type = parsed.chatType ? capitalize(parsed.chatType) : "";
      // Keep it brief
      if (type) {
        return `${platform} ${type}`;
      }
      return platform;
    }
    
    case "cron":
      return "Scheduled Task";
      
    case "hook":
      return "Webhook";
      
    default:
      // For truly unknown sessions, show a cleaned-up version
      return truncate(session.key, 24);
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// ============================================================================
// Tree Builder
// ============================================================================

export function buildSessionTree(
  sessions: Session[],
  subagentMeta?: Map<string, SubagentMeta>
): SessionTreeNode[] {
  // Parse all sessions
  const parsed = sessions.map(s => ({
    session: s,
    parsed: parseSessionKey(s.key),
  }));
  
  // Separate root sessions and child sessions
  const roots: SessionTreeNode[] = [];
  const childMap = new Map<string, SessionTreeNode[]>();
  
  for (const { session, parsed: parsedKey } of parsed) {
    const meta = subagentMeta?.get(session.key);
    const node: SessionTreeNode = {
      session,
      parsed: parsedKey,
      children: [],
      depth: 0,
      subagentMeta: meta,
    };
    
    // Determine parent: prefer metadata (actual parent) over parsed key (default to main)
    const actualParentKey = meta?.parentSessionKey ?? parsedKey.parentKey;
    
    if (actualParentKey) {
      // This is a child session (subagent)
      if (!childMap.has(actualParentKey)) {
        childMap.set(actualParentKey, []);
      }
      childMap.get(actualParentKey)!.push(node);
    } else {
      // This is a root session
      roots.push(node);
    }
  }
  
  // Attach children to parents
  for (const root of roots) {
    const children = childMap.get(root.session.key) ?? [];
    root.children = children.map(c => ({ ...c, depth: 1 }));
    // Sort children by time (newest first)
    root.children.sort((a, b) => {
      const aTime = a.session.lastTurnAt ?? a.session.createdAt ?? 0;
      const bTime = b.session.lastTurnAt ?? b.session.createdAt ?? 0;
      return bTime - aTime;
    });
  }
  
  // Handle orphaned children (parent session not in list)
  for (const [parentKey, children] of childMap) {
    if (!roots.find(r => r.session.key === parentKey)) {
      // Add orphaned children as roots with depth 0
      roots.push(...children.map(c => ({ ...c, depth: 0 })));
    }
  }
  
  // Sort roots by time (newest first)
  roots.sort((a, b) => {
    const aTime = a.session.lastTurnAt ?? a.session.createdAt ?? 0;
    const bTime = b.session.lastTurnAt ?? b.session.createdAt ?? 0;
    return bTime - aTime;
  });
  
  return roots;
}
