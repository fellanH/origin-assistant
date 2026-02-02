# Phase 2: Live Tool Event Handling

> **Goal**: Subscribe to the gateway's `agent` event stream to track tool executions in real-time, enabling a "glass box" UI during streaming.

---

## Architecture Context

The gateway broadcasts on **two independent event streams**:

| Stream | Content | Purpose |
|--------|---------|---------|
| `chat` | Text deltas only | Simple clients |
| `agent` | Tool phases, lifecycle, structured data | Rich UIs |

**Current state**: The UI only subscribes to `chat` events. Tools are invisible during streaming ("black box"), then suddenly appear when history loads ("glass box snap").

**Target state**: Subscribe to both streams. Show tools in real-time as they execute.

---

## Implementation Tasks

### Task 2.1: Define ToolExecutionState Type

**File**: `src/lib/use-gateway.ts`

**Action**: Add a type for tracking live tool executions.

```typescript
// Add after MessagePart type definition

/**
 * Live tool execution state, tracked via agent events.
 * This is ephemeral (not persisted) - used only during active streaming.
 */
export type ToolExecutionState = {
  toolCallId: string;
  name: string;
  phase: "executing" | "result" | "error";
  meta?: string;        // e.g., file path, command preview
  args?: unknown;       // Tool input (from start event)
  result?: unknown;     // Tool output (from result event)
  isError?: boolean;
  startedAt: number;    // For duration tracking
};
```

---

### Task 2.2: Add toolExecutions State to useOpenClawChat

**File**: `src/lib/use-gateway.ts`

**Action**: Add state for tracking live tool executions inside `useOpenClawChat` hook.

```typescript
// Inside useOpenClawChat, after messages state declaration

// Live tool executions (ephemeral, not persisted)
const [toolExecutions, setToolExecutions] = useState<Map<string, ToolExecutionState>>(
  new Map()
);
```

---

### Task 2.3: Subscribe to Agent Events

**File**: `src/lib/use-gateway.ts`

**Action**: Add a second event subscription for `agent` events inside `useOpenClawChat`.

**Location**: Add a new `useEffect` after the existing `chat` event subscription.

```typescript
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
        // NOTE: Do NOT use setTimeout for cleanup! See Task 2.4.
      }

      return next;
    });
  });

  return unsub;
}, [subscribe]);
```

---

### Task 2.4: Persistence-Aware Cleanup

**File**: `src/lib/use-gateway.ts`

**Action**: Clean up `toolExecutions` only when tools appear in persisted `message.parts`.

**Why not setTimeout?**

```
Timeline showing the bug with setTimeout:
─────────────────────────────────────────────────────────────────────────────
t=0ms     tool "result" event arrives, setTimeout(2000) starts
t=1500ms  network hiccup delays "chat final" event
t=2000ms  setTimeout fires, toolCallId deleted from toolExecutions
t=2500ms  "chat final" arrives, message.parts still empty (not yet loaded)
t=2500ms  UI shows NO tool - it was deleted before parts were populated!
─────────────────────────────────────────────────────────────────────────────
```

**Solution**: Delete from `toolExecutions` when the tool appears in the persisted message.

```typescript
// Add after the agent events useEffect

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
```

---

### Task 2.5: Return toolExecutions from Hook

**File**: `src/lib/use-gateway.ts`

**Action**: Add `toolExecutions` to the hook's return value.

```typescript
// Update the return statement of useOpenClawChat

return {
  messages,
  status,
  streamingContent,
  error,
  toolExecutions,  // <-- Add this
  sendMessage,
  abort,
  regenerate,
  isStreaming: status === "streaming",
  isSubmitted: status === "submitted",
  canAbort: status === "streaming" || status === "submitted",
};
```

---

### Task 2.6: Add setVerboseLevel to Gateway Client

**File**: `src/lib/gateway.ts`

**Action**: Add method to enable verbose tool events.

```typescript
// Add to GatewayClient class

/**
 * Set verbose level for a session.
 * Required for tool events to emit on the agent stream.
 */
async setVerboseLevel(sessionKey: string, level: "on" | "off"): Promise<void> {
  return this.request("sessions.patch", {
    key: sessionKey,
    verboseLevel: level,
  });
}
```

**Note**: This method should be called when opening a session to enable real-time tool events. Without `verboseLevel = "on"`, the gateway won't emit tool phase events.

---

### Task 2.7: Update Message Component for Dual-Source Rendering

**File**: `src/components/ai-elements/message.tsx`

**Action**: Accept `toolExecutions` prop and render both persisted and pending tools.

```tsx
import type { MessagePart, ToolExecutionState } from "@/lib/use-gateway";
import { Tool } from "./tool";

type MessageProps = {
  message: ChatMessage;
  isStreaming?: boolean;
  toolExecutions?: Map<string, ToolExecutionState>;
};

export function Message({ message, isStreaming, toolExecutions }: MessageProps) {
  // Compute which tools are already persisted in message.parts
  const persistedToolIds = useMemo(() => {
    if (!message.parts) return new Set<string>();
    return new Set(
      message.parts
        .filter((p) => p.type === "tool-call" || p.type === "tool-result")
        .map((p) => (p as { toolCallId: string }).toolCallId)
    );
  }, [message.parts]);

  // Pending tools: in toolExecutions but NOT in message.parts
  // These are "ghost tools" that arrived via agent events before chat final
  const pendingTools = useMemo(() => {
    if (!toolExecutions) return [];
    return Array.from(toolExecutions.entries()).filter(
      ([id]) => !persistedToolIds.has(id)
    );
  }, [toolExecutions, persistedToolIds]);

  return (
    <div className={cn("py-4", message.role === "user" && "bg-muted/30")}>
      <div className="max-w-3xl mx-auto px-4">
        {/* 1. Render persisted parts from message.parts */}
        {message.parts?.map((part, idx) => {
          switch (part.type) {
            case "text":
              return <MarkdownContent key={idx} content={part.text} />;

            case "reasoning":
              return (
                <Reasoning
                  key={idx}
                  content={part.text}
                  isStreaming={isStreaming && idx === message.parts!.length - 1}
                />
              );

            case "tool-call": {
              // Prefer live state if available (for duration tracking)
              const liveState = toolExecutions?.get(part.toolCallId);
              const state =
                liveState?.phase === "executing"
                  ? "executing"
                  : liveState?.phase === "error"
                    ? "error"
                    : "output-available";
              const duration = liveState?.startedAt
                ? Date.now() - liveState.startedAt
                : undefined;

              return (
                <Tool
                  key={`persisted-${part.toolCallId}`}
                  name={part.name}
                  state={state}
                  args={part.args}
                  meta={formatToolMeta(part.name, part.args)}
                  duration={duration}
                />
              );
            }

            case "tool-result":
              return (
                <Tool
                  key={`result-${part.toolCallId}`}
                  name={part.name}
                  state={part.isError ? "error" : "output-available"}
                  result={part.result}
                  isError={part.isError}
                />
              );

            default:
              return null;
          }
        })}

        {/* 2. Render PENDING tools (ghost tools from agent events) */}
        {pendingTools.map(([toolCallId, exec]) => (
          <Tool
            key={`pending-${toolCallId}`}
            name={exec.name}
            state={exec.phase === "executing" ? "executing" : exec.phase === "error" ? "error" : "output-available"}
            meta={exec.meta}
            args={exec.args}
            result={exec.result}
            isError={exec.isError}
            duration={Date.now() - exec.startedAt}
          />
        ))}

        {/* 3. Fallback: render raw content if no parts */}
        {!message.parts?.length && <MarkdownContent content={message.content} />}

        {/* 4. Streaming cursor */}
        {isStreaming && <span className="animate-pulse">▊</span>}
      </div>
    </div>
  );
}
```

---

### Task 2.8: Update Chat Page to Pass toolExecutions

**File**: `src/app/page.tsx`

**Action**: Get `toolExecutions` from hook and pass to Message component.

```tsx
// In the chat page component

const {
  messages,
  toolExecutions,  // <-- Add this
  isStreaming,
  streamingContent,
  // ... other destructured values
} = useOpenClawChat(client, sessionKey, subscribe, handleMessageSent);

// In the message rendering:
{messages.map((message, idx) => {
  const isLatestAssistant = message.role === "assistant" && idx === messages.length - 1;

  return (
    <Message
      key={message.id}
      message={message}
      isStreaming={isLatestAssistant && isStreaming}
      // Pass toolExecutions only to latest assistant message
      toolExecutions={isLatestAssistant ? toolExecutions : undefined}
    />
  );
})}
```

---

## State Machine: Tool Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TOOL VISUALIZATION STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │   HIDDEN    │ ← Initial state, no tool_use seen                         │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ agent event: stream="tool", phase="start"                         │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │   PENDING   │ ← In toolExecutions, NOT in message.parts                  │
│  │  (Live UI)  │   Show: spinner, tool name, input preview                  │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ agent event: stream="tool", phase="result"                        │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │  COMPLETED  │ ← In toolExecutions with result                            │
│  │  (Live UI)  │   Show: checkmark/error, result preview                    │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ message.parts includes tool-call/tool-result                      │
│         │ (happens on "final" event or loadHistory)                         │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │  PERSISTED  │ ← In message.parts, deleted from toolExecutions            │
│  │ (Static UI) │   Show: from message.parts data                            │
│  └─────────────┘                                                            │
│                                                                             │
│  INVARIANT: A tool is rendered from exactly ONE source at a time:           │
│             Either toolExecutions (live) OR message.parts (persisted)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

After implementing Phase 2:

- [ ] `toolExecutions` state exists in `useOpenClawChat`
- [ ] Agent events are subscribed and filtered by sessionKey
- [ ] Tools appear immediately when `phase="start"` event arrives
- [ ] Tools update to success/error when `phase="result"` event arrives
- [ ] Tools are removed from `toolExecutions` when they appear in `message.parts`
- [ ] No "ghost tool flicker" (tools don't briefly appear twice)
- [ ] Duration tracking works (shows elapsed time)
- [ ] `setVerboseLevel("on")` is called when opening sessions

---

## Testing Approach

### Test 1: Real-Time Tool Visibility

1. Open a session and send a message that triggers tool use (e.g., "read package.json")
2. Watch the UI during execution:
   - [ ] Tool card appears with spinner when execution starts
   - [ ] Tool card shows result when execution completes
   - [ ] No flash/flicker when transitioning to persisted state

### Test 2: Page Reload Recovery

1. Trigger a tool execution
2. While the tool is running, refresh the page
3. Verify:
   - [ ] Tool state is lost (toolExecutions is ephemeral)
   - [ ] When message history loads, tool appears from persisted parts
   - [ ] UI shows correct final state

### Test 3: Network Delay Handling

1. Use browser devtools to simulate slow network
2. Trigger a tool execution
3. Verify:
   - [ ] Tool stays visible during network delays
   - [ ] No premature cleanup (no setTimeout race condition)
   - [ ] Cleanup happens when message.parts is populated

### Test 4: Multiple Concurrent Tools

1. Send a message that triggers multiple tools
2. Verify:
   - [ ] All tools appear in sequence as events arrive
   - [ ] Each tool has its own spinner/completion state
   - [ ] Duration tracking is independent for each tool

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/use-gateway.ts` | Add `ToolExecutionState`, agent event subscription, cleanup logic, return `toolExecutions` |
| `src/lib/gateway.ts` | Add `setVerboseLevel()` method |
| `src/components/ai-elements/message.tsx` | Accept `toolExecutions` prop, render pending tools |
| `src/app/page.tsx` | Pass `toolExecutions` to Message component |

---

## Dependencies

- **Requires Phase 1**: The `MessagePart` type with `toolCallId` is needed for correlation
- **Requires verbose mode**: `setVerboseLevel("on")` must be called for tool events to emit

---

## Edge Cases

### Tool Without Result Event

If a tool starts but never receives a result (e.g., gateway crash):
- Tool stays in `toolExecutions` with phase="executing"
- On page reload, tool is lost (expected - ephemeral state)
- If history loads, tool may appear in parts (if it was persisted before crash)

### Duplicate Tool Events

If the gateway sends duplicate events (unlikely but possible):
- `Map.set()` with same key just overwrites
- No visual duplication due to key-based rendering

### Session Switch Mid-Execution

If user switches sessions while a tool is executing:
- Events filtered by `sessionKey` - old session events ignored
- `toolExecutions` cleared when session changes (add to session switch logic)

```typescript
// Add to session key change handling
useEffect(() => {
  setToolExecutions(new Map()); // Clear on session change
}, [sessionKey]);
```

---

## Performance Considerations

1. **Map vs Object**: Using `Map<string, ToolExecutionState>` for O(1) lookups
2. **useMemo for pendingTools**: Avoids recomputing filter on every render
3. **Conditional pass**: Only pass `toolExecutions` to latest assistant message
4. **Cleanup efficiency**: Only iterate `toolExecutions` when `messages` changes

---

## Future Enhancements (Out of Scope)

- **Subagent tracking**: Track `sessions_spawn` tool calls for nested agent display
- **Tool approval**: Wire `approval-requested` state to confirmation UI
- **Verbose toggle**: Add setting to enable/disable verbose mode per session
- **Tool filtering**: Allow user to hide/show specific tool types
