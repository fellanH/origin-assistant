/**
 * Session utilities for hierarchical session tree
 */

// ============================================================================
// Types
// ============================================================================

export type ParsedSessionKey = {
  agentId: string;
  type: "main" | "subagent" | "channel" | "cron" | "hook" | "other";
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
};

export type SubagentMeta = {
  label?: string;
  status?: "spawning" | "running" | "completed" | "error" | "timeout";
  duration?: number;
  model?: string;
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
  
  // agent:main:main
  if (parts[0] === "agent" && parts.length >= 3 && parts[2] === "main") {
    return {
      agentId: parts[1],
      type: "main",
      identifier: "main",
    };
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
  
  // cron:jobId
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
    case "main": return "💬";
    case "subagent": return "🤖";
    case "channel": {
      switch (parsed.channelType) {
        case "telegram": return "📱";
        case "discord": return "🎮";
        case "slack": return "💼";
        case "whatsapp": return "📲";
        default: return "📢";
      }
    }
    case "cron": return "⏰";
    case "hook": return "🔗";
    default: return "📄";
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getSessionDisplayName(session: Session, parsed: ParsedSessionKey): string {
  if (session.label) return session.label;
  
  switch (parsed.type) {
    case "main":
      return "Main Session";
    case "subagent":
      return `Subagent ${parsed.identifier.slice(0, 6)}`;
    case "channel":
      return `${capitalize(parsed.channelType || "channel")}: ${parsed.chatType || ""} ${parsed.identifier.slice(0, 8)}`.trim();
    case "cron":
      return `Cron: ${parsed.identifier}`;
    case "hook":
      return `Hook: ${parsed.identifier.slice(0, 8)}`;
    default:
      return session.key.slice(0, 20);
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
    const node: SessionTreeNode = {
      session,
      parsed: parsedKey,
      children: [],
      depth: 0,
      subagentMeta: subagentMeta?.get(session.key),
    };
    
    if (parsedKey.parentKey) {
      // This is a child session (subagent)
      if (!childMap.has(parsedKey.parentKey)) {
        childMap.set(parsedKey.parentKey, []);
      }
      childMap.get(parsedKey.parentKey)!.push(node);
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
