# Phase 3: Hierarchical Session Sidebar ✅ COMPLETED

> **Status**: Implemented on 2026-02-02
>
> **Goal**: Group subagent sessions under their parent session in a collapsible tree structure.

---

## Current State

```
Sessions (flat list)
├── Main Session
├── Session abc123
├── Session def456 (subagent)
└── Session ghi789 (subagent)
```

## Target State

```
Sessions (tree)
├── 💬 Main Session
│   ├── 🤖 Haiku Generator (17s, completed)
│   └── 🤖 Research Task (running)
├── 💬 Session abc123
│   └── 🤖 Code Review (45s, completed)
└── 💬 Telegram: Dev Group
```

---

## Architecture

### Session Key Patterns

| Pattern | Type | Parent |
|---------|------|--------|
| `agent:main:main` | Main chat | - |
| `agent:main:subagent:uuid` | Subagent | `agent:main:main` |
| `agent:main:telegram:group:id` | Channel group | - |
| `agent:main:discord:channel:id` | Channel | - |
| `cron:jobId` | Cron job | - |

**Key insight**: Subagent sessions follow the pattern `agent:<agentId>:subagent:<uuid>`. The parent is `agent:<agentId>:main` (or could be another session that spawned it).

### Data Model

```typescript
// Extended session type for tree structure
export type SessionTreeNode = {
  session: Session;
  children: SessionTreeNode[];
  isExpanded: boolean;
  depth: number;
  // Subagent-specific metadata (from tool call)
  subagentMeta?: {
    label?: string;
    status?: "spawning" | "running" | "completed" | "error" | "timeout";
    duration?: number;
    model?: string;
  };
};

// Parse session key to extract type and potential parent
export type ParsedSessionKey = {
  agentId: string;
  type: "main" | "subagent" | "channel" | "cron" | "hook" | "other";
  channelType?: string;  // telegram, discord, etc.
  chatType?: string;     // group, channel, dm
  identifier: string;    // uuid, group id, etc.
  parentKey?: string;    // For subagents: the parent session key
};
```

---

## Implementation Plan

### Step 1: Session Key Parser

**File**: `src/lib/session-utils.ts` (NEW)

```typescript
export function parseSessionKey(key: string): ParsedSessionKey {
  const parts = key.split(":");
  
  // agent:main:main
  if (parts[0] === "agent" && parts[2] === "main") {
    return {
      agentId: parts[1],
      type: "main",
      identifier: "main",
    };
  }
  
  // agent:main:subagent:uuid
  if (parts[0] === "agent" && parts[2] === "subagent") {
    return {
      agentId: parts[1],
      type: "subagent",
      identifier: parts[3],
      parentKey: `agent:${parts[1]}:main`, // Default parent is main
    };
  }
  
  // agent:main:telegram:group:12345
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
      identifier: parts[1],
    };
  }
  
  return {
    agentId: "unknown",
    type: "other",
    identifier: key,
  };
}

export function getSessionIcon(parsed: ParsedSessionKey): string {
  switch (parsed.type) {
    case "main": return "💬";
    case "subagent": return "🤖";
    case "channel": return "📢";
    case "cron": return "⏰";
    default: return "📄";
  }
}

export function getSessionDisplayName(session: Session, parsed: ParsedSessionKey): string {
  if (session.label) return session.label;
  
  switch (parsed.type) {
    case "main":
      return "Main Session";
    case "subagent":
      return `Subagent ${parsed.identifier.slice(0, 6)}`;
    case "channel":
      return `${capitalize(parsed.channelType)}: ${parsed.chatType} ${parsed.identifier.slice(0, 8)}`;
    case "cron":
      return `Cron: ${parsed.identifier}`;
    default:
      return session.key.slice(0, 20);
  }
}
```

### Step 2: Tree Builder

**File**: `src/lib/session-utils.ts` (continued)

```typescript
export function buildSessionTree(
  sessions: Session[],
  subagentMeta?: Map<string, SubagentState>
): SessionTreeNode[] {
  const parsed = sessions.map(s => ({
    session: s,
    parsed: parseSessionKey(s.key),
  }));
  
  // Separate root sessions and child sessions
  const roots: SessionTreeNode[] = [];
  const childMap = new Map<string, SessionTreeNode[]>();
  
  for (const { session, parsed } of parsed) {
    const node: SessionTreeNode = {
      session,
      children: [],
      isExpanded: true, // Default expanded
      depth: 0,
      subagentMeta: subagentMeta?.get(session.key) ? {
        label: subagentMeta.get(session.key)!.label,
        status: subagentMeta.get(session.key)!.status,
        duration: subagentMeta.get(session.key)!.completedAt
          ? subagentMeta.get(session.key)!.completedAt! - subagentMeta.get(session.key)!.startedAt
          : Date.now() - subagentMeta.get(session.key)!.startedAt,
        model: subagentMeta.get(session.key)!.model,
      } : undefined,
    };
    
    if (parsed.parentKey) {
      // This is a child session
      if (!childMap.has(parsed.parentKey)) {
        childMap.set(parsed.parentKey, []);
      }
      childMap.get(parsed.parentKey)!.push(node);
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
      // Create a virtual parent or add as roots
      roots.push(...children.map(c => ({ ...c, depth: 0 })));
    }
  }
  
  // Sort roots by time
  roots.sort((a, b) => {
    const aTime = a.session.lastTurnAt ?? a.session.createdAt ?? 0;
    const bTime = b.session.lastTurnAt ?? b.session.createdAt ?? 0;
    return bTime - aTime;
  });
  
  return roots;
}
```

### Step 3: Session Tree Item Component

**File**: `src/components/session-tree-item.tsx` (NEW)

```typescript
type SessionTreeItemProps = {
  node: SessionTreeNode;
  currentSessionKey: string;
  onSessionSelect: (key: string) => void;
  onDelete: (key: string) => void;
  onToggleExpand: (key: string) => void;
  expandedKeys: Set<string>;
};

export function SessionTreeItem({
  node,
  currentSessionKey,
  onSessionSelect,
  onDelete,
  onToggleExpand,
  expandedKeys,
}: SessionTreeItemProps) {
  const parsed = parseSessionKey(node.session.key);
  const icon = getSessionIcon(parsed);
  const displayName = getSessionDisplayName(node.session, parsed);
  const isActive = node.session.key === currentSessionKey;
  const isExpanded = expandedKeys.has(node.session.key);
  const hasChildren = node.children.length > 0;
  
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent/50",
        )}
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
        onClick={() => onSessionSelect(node.session.key)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(node.session.key); }}
            className="p-0.5 rounded hover:bg-accent/50"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" /> // Spacer
        )}
        
        {/* Icon */}
        <span className="text-sm">{icon}</span>
        
        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate">{displayName}</span>
          {node.subagentMeta && (
            <span className={cn(
              "ml-2 text-xs",
              node.subagentMeta.status === "running" && "text-yellow-500",
              node.subagentMeta.status === "completed" && "text-green-500",
              node.subagentMeta.status === "error" && "text-red-500",
            )}>
              ({formatDuration(node.subagentMeta.duration ?? 0)}, {node.subagentMeta.status})
            </span>
          )}
        </div>
        
        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.session.key); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <SessionTreeItem
              key={child.session.key}
              node={child}
              currentSessionKey={currentSessionKey}
              onSessionSelect={onSessionSelect}
              onDelete={onDelete}
              onToggleExpand={onToggleExpand}
              expandedKeys={expandedKeys}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 4: Update Session Sidebar

**File**: `src/components/session-sidebar.tsx`

Changes:
1. Import tree utilities and component
2. Build tree from flat sessions
3. Track expanded state in localStorage
4. Render tree instead of flat list

```typescript
// Add to imports
import { buildSessionTree, type SessionTreeNode } from "@/lib/session-utils";
import { SessionTreeItem } from "./session-tree-item";

// Add state for expanded keys
const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
  if (typeof window === "undefined") return new Set(["agent:main:main"]);
  const saved = localStorage.getItem("cortana.sidebar.expanded");
  return saved ? new Set(JSON.parse(saved)) : new Set(["agent:main:main"]);
});

// Save expanded state
useEffect(() => {
  localStorage.setItem("cortana.sidebar.expanded", JSON.stringify([...expandedKeys]));
}, [expandedKeys]);

// Build tree from sessions
const sessionTree = useMemo(() => buildSessionTree(sessions), [sessions]);

// Toggle expand handler
const handleToggleExpand = useCallback((key: string) => {
  setExpandedKeys(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}, []);

// Replace flat list render with tree render
{sessionTree.map(node => (
  <SessionTreeItem
    key={node.session.key}
    node={node}
    currentSessionKey={currentSessionKey}
    onSessionSelect={onSessionSelect}
    onDelete={(key) => handleDeleteSession(key)}
    onToggleExpand={handleToggleExpand}
    expandedKeys={expandedKeys}
  />
))}
```

### Step 5: Connect Subagent Metadata

Pass subagent state from the main chat to enrich sidebar display:

**Option A**: Pass via props (simple)
```typescript
// In page.tsx, pass subagents to sidebar
<SessionSidebar
  subagentMeta={subagents}
  ...
/>
```

**Option B**: Global state (if needed across components)
```typescript
// Create a SubagentContext for sharing state
const SubagentContext = createContext<Map<string, SubagentState>>(new Map());
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/session-utils.ts` | CREATE | Key parser, tree builder, display helpers |
| `src/components/session-tree-item.tsx` | CREATE | Recursive tree item component |
| `src/components/session-sidebar.tsx` | MODIFY | Use tree structure, track expanded state |
| `src/app/page.tsx` | MODIFY | Pass subagent metadata to sidebar (optional) |

---

## Estimated Time

| Task | Time |
|------|------|
| Step 1: Session key parser | 20 min |
| Step 2: Tree builder | 30 min |
| Step 3: Tree item component | 45 min |
| Step 4: Sidebar integration | 30 min |
| Step 5: Subagent metadata | 15 min |
| Testing + polish | 30 min |
| **Total** | **~2.5 hours** |

---

## Future Enhancements

- **Drag & drop** — Reorder sessions, move subagents between groups
- **Custom folders** — User-created groups with labels
- **Search/filter** — Quick find across all sessions
- **Batch actions** — Delete multiple sessions, archive old ones
- **Session pinning** — Pin important sessions to top

---

## Visual Mockup

```
┌─────────────────────────────────────┐
│ Sessions                    🔄 + ◀ │
├─────────────────────────────────────┤
│ ▼ 💬 Main Session                   │
│   ├── 🤖 Haiku Generator            │
│   │      (17s, completed) ✓         │
│   └── 🤖 Research Task              │
│          (running...) 🔄            │
│                                     │
│ ▶ 💬 Session abc123          (2)    │
│                                     │
│ 📢 Telegram: Dev Group              │
│                                     │
│ ⏰ Cron: morning-briefing           │
└─────────────────────────────────────┘
```

Legend:
- ▼/▶ = Expanded/collapsed
- (2) = Number of children when collapsed
- ✓ = Completed subagent
- 🔄 = Running subagent

