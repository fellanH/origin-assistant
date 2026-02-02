# Tasks: Subagent Live Status Enhancement

> Make subagent artifacts show real-time activity from the child session.

---

## Problem

Currently, subagents show:
- Status: spawning → running → completed (coarse)
- Task description
- Result summary (after completion)
- Elapsed time

But while "running", there's **no visibility** into what the subagent is actually doing.

## Solution

1. Subscribe to child session's agent events
2. Track current tool execution in SubagentState
3. Display live tool activity in the artifact
4. Add clickable link to open subagent session

---

## Task 1: Extend SubagentState Type

**Status:** PENDING
**File:** `src/lib/use-gateway.ts`

Add fields to track live activity:

```typescript
export type SubagentState = {
  // ... existing fields
  
  // Live activity tracking
  currentTool?: {
    name: string;
    phase: "executing" | "result";
    startedAt: number;
  };
  toolCount?: number;  // Total tools executed
  lastActivity?: number;  // Timestamp of last event
};
```

**Acceptance criteria:**
- [ ] SubagentState type extended
- [ ] Build passes

---

## Task 2: Subscribe to Child Session Events

**Status:** PENDING
**Depends on:** Task 1
**File:** `src/lib/use-gateway.ts`

Add effect that subscribes to agent events for running subagents:

```typescript
// After the main agent event subscription (~line 900)
useEffect(() => {
  // Get all running subagents with child session keys
  const runningChildren = Array.from(subagents.values())
    .filter(s => s.status === "running" && s.childSessionKey);
  
  if (runningChildren.length === 0) return;
  
  // Single subscription, filter by child session keys
  const childKeys = new Set(runningChildren.map(s => s.childSessionKey!));
  
  const unsub = subscribe("agent", (evt) => {
    const payload = evt.payload as {
      sessionKey?: string;
      stream?: string;
      data?: {
        phase?: string;
        name?: string;
        toolCallId?: string;
      };
    };
    
    if (!payload?.sessionKey || !childKeys.has(payload.sessionKey)) return;
    if (payload.stream !== "tool" || !payload.data) return;
    
    const { phase, name } = payload.data;
    
    setSubagents(prev => {
      const next = new Map(prev);
      // Find subagent by childSessionKey
      for (const [id, sub] of next) {
        if (sub.childSessionKey === payload.sessionKey) {
          next.set(id, {
            ...sub,
            currentTool: phase === "start" ? {
              name: name ?? "tool",
              phase: "executing",
              startedAt: Date.now(),
            } : phase === "result" ? undefined : sub.currentTool,
            toolCount: phase === "start" ? (sub.toolCount ?? 0) + 1 : sub.toolCount,
            lastActivity: Date.now(),
          });
          break;
        }
      }
      return next;
    });
  });
  
  return unsub;
}, [subagents, subscribe]);
```

**Notes:**
- Only subscribe when there are running subagents
- Clean up subscription when subagents complete
- Use Set for O(1) lookup of child session keys

**Acceptance criteria:**
- [ ] Effect subscribes to agent events for running children
- [ ] SubagentState updates with currentTool when child executes tools
- [ ] Subscription cleans up when subagents complete
- [ ] Build passes

---

## Task 3: Display Current Tool in SubagentArtifact

**Status:** PENDING
**Depends on:** Task 2
**File:** `src/components/ai-elements/subagent-artifact.tsx`

Update the component to show current activity:

**In the header area, after status badge:**
```tsx
{/* Current activity indicator */}
{subagent.currentTool && (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
    <Loader className="h-3 w-3" />
    <span className="font-mono">{subagent.currentTool.name}</span>
  </div>
)}

{/* Tool count indicator */}
{subagent.toolCount && subagent.toolCount > 0 && (
  <span className="text-xs text-muted-foreground">
    {subagent.toolCount} tool{subagent.toolCount > 1 ? 's' : ''}
  </span>
)}
```

**Update status label when tool is running:**
```tsx
// Instead of just "Running", show what's happening
const getStatusLabel = () => {
  if (subagent.status === "running" && subagent.currentTool) {
    return `Running: ${subagent.currentTool.name}`;
  }
  return config.label;
};
```

**Acceptance criteria:**
- [ ] Current tool name shown with loading indicator
- [ ] Tool count displayed
- [ ] Status text shows current tool when executing
- [ ] Animation/pulse effect for activity
- [ ] Build passes

---

## Task 4: Add Session Link

**Status:** PENDING
**File:** `src/components/ai-elements/subagent-artifact.tsx`

Add props for session navigation:

```typescript
export type SubagentArtifactProps = {
  // ... existing
  onNavigateToSession?: (sessionKey: string) => void;
};
```

**Add clickable label/link in header:**
```tsx
{/* Clickable session label */}
{subagent.childSessionKey && onNavigateToSession && (
  <button
    onClick={() => onNavigateToSession(subagent.childSessionKey!)}
    className="text-xs text-muted-foreground hover:text-primary hover:underline"
    title="Open subagent session"
  >
    {subagent.label || "View session →"}
  </button>
)}
```

**Or make the whole header clickable:**
```tsx
<button
  type="button"
  onClick={() => subagent.childSessionKey && onNavigateToSession?.(subagent.childSessionKey)}
  disabled={!subagent.childSessionKey || !onNavigateToSession}
  className={cn(
    "flex items-center justify-between gap-3 px-4 py-3 w-full text-left",
    subagent.childSessionKey && onNavigateToSession && "cursor-pointer hover:bg-muted/50"
  )}
>
```

**Acceptance criteria:**
- [ ] Session link/button added
- [ ] Clicking navigates to child session
- [ ] Only enabled when childSessionKey exists
- [ ] Accessible (keyboard navigable)
- [ ] Build passes

---

## Task 5: Wire Up Session Navigation in page.tsx

**Status:** PENDING
**Depends on:** Task 4
**File:** `src/app/page.tsx`

Pass the navigation callback to SubagentArtifact via MessageParts:

```typescript
// In page.tsx, add handler
const handleNavigateToSession = useCallback((sessionKey: string) => {
  setSessionKey(sessionKey);
}, []);

// Pass to MessageParts
<MessageParts
  // ... existing props
  onSubagentNavigateToSession={handleNavigateToSession}
/>
```

**Update MessageParts to pass it through:**
```typescript
// In message-parts.tsx
<SubagentArtifact
  subagent={sub}
  onViewHistory={onSubagentViewHistory}
  onStop={onSubagentStop}
  onNavigateToSession={onSubagentNavigateToSession}
/>
```

**Acceptance criteria:**
- [ ] Navigation handler created in page.tsx
- [ ] Passed through MessageParts to SubagentArtifact
- [ ] Clicking session link switches to that session
- [ ] Build passes

---

## Visual Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 review-backend-arch              claude-sonnet               │
│ ● Running: Read                              1m 23s  •  12 tools│
│                                          [Open Session →]       │
├─────────────────────────────────────────────────────────────────┤
│ Task: Review the Origin codebase focusing on backend arch...    │
├─────────────────────────────────────────────────────────────────┤
│ ⏺ Read  src/gateway/server.impl.ts                              │  <- Current tool
├─────────────────────────────────────────────────────────────────┤
│ ▶ View History   ⏹ Stop                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing

After all tasks:
1. Spawn a subagent with a multi-tool task
2. Watch the artifact update in real-time with current tool
3. Verify tool count increments
4. Click session link, verify it switches to child session
5. When subagent completes, verify final state is correct

---

## Implementation Notes

**Why subscribe to agent events (not chat events)?**
- Agent events have structured tool data (name, phase, toolCallId)
- Chat events are text deltas, would need parsing

**Performance considerations:**
- Only subscribe when there are running subagents
- Use Set for O(1) child key lookups
- Single subscription handles all children (filter in callback)

**Edge cases:**
- Subagent completes while we're updating currentTool
- Multiple subagents running simultaneously
- Rapid tool execution (debounce UI updates?)

---

_Created: 2026-02-02_
