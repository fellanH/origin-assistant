# Phase 1: Enhanced Message Model

> **Goal**: Extend the message type system to support structured content blocks (text, tool calls, tool results, reasoning) and parse them from gateway history.

---

## Current State

**File**: `src/lib/use-gateway.ts` (lines 12-23)

```typescript
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;           // Plain text only
  timestamp?: number;
  parts?: Array<{            // Optional, not actively used
    type: "text" | "reasoning" | "tool-call" | "tool-result";
    text?: string;
    toolName?: string;
    result?: unknown;
  }>;
};
```

**Problems**:
1. `parts` type is loosely defined (missing `toolCallId` for correlation)
2. History parsing ignores structured `content` arrays from gateway
3. Storage (`StoredMessage`) doesn't persist `parts`

---

## Implementation Tasks

### Task 1.1: Define Precise MessagePart Types

**File**: `src/lib/use-gateway.ts`

**Action**: Replace the loose `parts` array with a discriminated union.

```typescript
// Add after line 10 (before ChatMessage type)

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
  content: string;              // Plain text (backwards compat + search)
  parts?: MessagePart[];        // Structured content blocks
  timestamp?: number;
};
```

**Why `toolCallId`**: This is the correlation key between tool-call and tool-result. It's also used to match live `toolExecutions` (Phase 2) with persisted parts.

---

### Task 1.2: Extend StoredMessage for Persistence

**File**: `src/lib/storage.ts`

**Action**: Add `parts` to the storage type so structured content survives page reloads.

```typescript
// Update StoredMessage type (around line 106-119)

export type StoredMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolCallId: string; name: string; args?: unknown }
  | { type: "tool-result"; toolCallId: string; name: string; result?: string; isError?: boolean };

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: StoredMessagePart[];  // <-- Add this
  timestamp: number;
};
```

**Note**: `result` is `string` in storage (JSON stringified) to avoid localStorage bloat from large objects.

---

### Task 1.3: Create parseHistoryMessage Function

**File**: `src/lib/use-gateway.ts`

**Action**: Add a parsing function that extracts structured blocks from gateway history.

**Location**: Add before `useOpenClawChat` hook (around line 80)

```typescript
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
 * Normalize role string to valid ChatMessage role.
 */
function normalizeRole(role: string): "user" | "assistant" {
  if (role === "user") return "user";
  return "assistant"; // Default to assistant for tool, system, etc.
}
```

---

### Task 1.4: Update loadHistory Handler

**File**: `src/lib/use-gateway.ts`

**Action**: Replace the simple mapping in `loadHistory` callback with `parseHistoryMessage`.

**Location**: Inside `useOpenClawChat` hook, find the `loadHistory` handling (around lines 160-180)

**Before**:
```typescript
// Current simple mapping
const mapped: ChatMessage[] = history.map((msg: unknown, i: number) => ({
  id: String((msg as Record<string, unknown>).id ?? `h-${i}`),
  role: ((msg as Record<string, unknown>).role as "user" | "assistant") ?? "assistant",
  content: String((msg as Record<string, unknown>).content ?? (msg as Record<string, unknown>).text ?? ""),
  timestamp: typeof (msg as Record<string, unknown>).timestamp === "number"
    ? (msg as Record<string, unknown>).timestamp as number
    : Date.now(),
}));
```

**After**:
```typescript
// Parse structured content blocks
const mapped: ChatMessage[] = history.map((msg: unknown, i: number) =>
  parseHistoryMessage(msg, i)
);
```

---

### Task 1.5: Update saveLocalMessages to Include Parts

**File**: `src/lib/storage.ts`

**Action**: Ensure `parts` are serialized when saving messages.

The current `saveLocalMessages` function already uses `JSON.stringify`, so it will automatically include `parts` if present. However, verify the type compatibility:

```typescript
// In saveLocalMessages or addLocalMessage, ensure conversion handles parts:

function toStoredMessage(msg: ChatMessage): StoredMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    parts: msg.parts?.map(part => {
      if (part.type === "tool-result" && part.result !== undefined) {
        return {
          ...part,
          result: typeof part.result === "string" ? part.result : JSON.stringify(part.result),
        };
      }
      return part;
    }),
    timestamp: msg.timestamp ?? Date.now(),
  };
}
```

---

### Task 1.6: Update Message Component to Render Parts

**File**: `src/components/ai-elements/message.tsx`

**Action**: Render structured parts instead of just raw content.

**Location**: In the `Message` component render function

```tsx
// Import existing components
import { Tool } from "./tool";
import { Reasoning } from "./reasoning";

// In the Message component, add parts rendering:

function MessageContent({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  // If parts exist, render them
  if (message.parts && message.parts.length > 0) {
    return (
      <>
        {message.parts.map((part, idx) => {
          switch (part.type) {
            case "text":
              return (
                <div key={idx} className="message-text">
                  <MarkdownContent content={part.text} />
                </div>
              );

            case "reasoning":
              return (
                <Reasoning
                  key={idx}
                  content={part.text}
                  isStreaming={isStreaming && idx === message.parts!.length - 1}
                />
              );

            case "tool-call":
              return (
                <Tool
                  key={`call-${part.toolCallId}`}
                  name={part.name}
                  state="executing"
                  args={part.args}
                  meta={formatToolMeta(part.name, part.args)}
                />
              );

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
      </>
    );
  }

  // Fallback: render raw content as markdown
  return <MarkdownContent content={message.content} />;
}

// Helper for tool metadata display
function formatToolMeta(name: string, args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const a = args as Record<string, unknown>;

  if (name === "Read" && a.file_path) return String(a.file_path);
  if (name === "Write" && a.file_path) return String(a.file_path);
  if (name === "Bash" && a.command) return String(a.command).slice(0, 50);
  if (name === "Glob" && a.pattern) return String(a.pattern);
  if (name === "Grep" && a.pattern) return String(a.pattern);
  if (name === "WebFetch" && a.url) return String(a.url);

  return undefined;
}
```

---

## Verification Checklist

After implementing Phase 1:

- [ ] `ChatMessage.parts` is a proper discriminated union
- [ ] `StoredMessage.parts` persists to localStorage
- [ ] `parseHistoryMessage` extracts all block types from gateway history
- [ ] Loading a session with tools shows `<Tool>` components
- [ ] Loading a session with reasoning shows `<Reasoning>` components
- [ ] Plain text messages still render correctly (backwards compat)
- [ ] New messages are saved with their `parts` array

---

## Testing Approach

1. **Manual Test**: Load a session that has tool usage in history
   - Verify tool calls render as `<Tool>` components (not raw JSON)
   - Verify tool results show success/error states

2. **Manual Test**: Load a session with extended thinking
   - Verify reasoning blocks render as `<Reasoning>` components
   - Verify they're collapsible

3. **Console Test**: Check localStorage for a session
   ```javascript
   JSON.parse(localStorage.getItem('cortana.messages.<sessionKey>'))
   ```
   - Verify `parts` arrays are present on messages with structured content

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/use-gateway.ts` | Add `MessagePart` type, `parseHistoryMessage()`, update history mapping |
| `src/lib/storage.ts` | Add `StoredMessagePart` type, extend `StoredMessage` |
| `src/components/ai-elements/message.tsx` | Add parts rendering logic |

---

## Dependencies on Phase 2

Phase 1 creates the **data model** for structured messages. Phase 2 adds **live tool tracking** that uses the same `toolCallId` correlation. The two phases share:

- `MessagePart` type (specifically `tool-call` and `tool-result`)
- `toolCallId` as the correlation key
- The `<Tool>` component for rendering

Phase 1 can be tested independently by loading historical sessions with tool usage.
