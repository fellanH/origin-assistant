# Task 4: Implement Inline Streaming Message Model

## Status: COMPLETE

## Objective
Eliminate the "double bubble" streaming issue by making streaming content render inline in the message list instead of as a separate element.

## Current Problem
1. During streaming, there's a separate `<motion.div key="streaming">` element
2. When `final` arrives, that element disappears AND a new message is added
3. This causes a visual "jump" as two DOM operations happen

## Solution
1. When streaming starts, immediately add a placeholder message to the array
2. During streaming, update that message's content in-place
3. On `final`, update the message to final state (no add/remove)

## Requirements

### 1. Update SessionData type
Add to `src/lib/session-store.ts`:
```typescript
interface SessionData {
  // ... existing fields
  streamingMessageId: string | null;  // ID of message being streamed
}
```

### 2. Update createEmptySession
```typescript
function createEmptySession(key: string): SessionData {
  return {
    // ... existing
    streamingMessageId: null,
  };
}
```

### 3. Update processChatEvent for "delta"
When first delta arrives (no streamingMessageId):
```typescript
case "delta": {
  const deltaText = extractText(payload.message);
  const currentSession = get().sessions.get(key);
  
  if (!currentSession?.streamingMessageId) {
    // First delta — create placeholder message
    const streamingId = `streaming-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: streamingId,
      role: "assistant",
      content: deltaText || "",
      timestamp: Date.now(),
    };
    updateSession(key, (s) => ({
      messages: [...s.messages, placeholderMsg],
      streamingMessageId: streamingId,
      status: "streaming",
      streamingContent: deltaText || "",
    }));
  } else {
    // Subsequent deltas — update existing message
    updateSession(key, (s) => {
      const newMessages = [...s.messages];
      const idx = newMessages.findIndex(m => m.id === s.streamingMessageId);
      if (idx >= 0) {
        newMessages[idx] = {
          ...newMessages[idx],
          content: deltaText || "",
        };
      }
      return {
        messages: newMessages,
        streamingContent: deltaText || "",
      };
    });
  }
  break;
}
```

### 4. Update processChatEvent for "final"
```typescript
case "final": {
  const currentSession = get().sessions.get(key);
  const finalText = currentSession?.streamingContent || extractText(payload.message);
  const finalParts = extractParts(payload.message);
  
  updateSession(key, (s) => {
    const newMessages = [...s.messages];
    
    if (s.streamingMessageId) {
      // Update existing streaming message to final
      const idx = newMessages.findIndex(m => m.id === s.streamingMessageId);
      if (idx >= 0) {
        newMessages[idx] = {
          ...newMessages[idx],
          id: `assistant-${Date.now()}`,  // New permanent ID
          content: finalText,
          parts: finalParts,
        };
      }
    } else if (finalText || finalParts) {
      // No streaming message (edge case) — add new
      newMessages.push({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: finalText,
        parts: finalParts,
        timestamp: Date.now(),
      });
    }
    
    return {
      messages: newMessages,
      streamingContent: "",
      streamingMessageId: null,
      status: "idle",
      currentRunId: null,
    };
  });
  
  // Persist to localStorage (use final message)
  // ... existing persistence code
  break;
}
```

### 5. Handle abort/error similarly
Update "aborted" and "error" cases to clear streamingMessageId.

## Success Criteria
- [x] streamingMessageId added to SessionData
- [x] Delta creates/updates inline message
- [x] Final updates existing message (no add/remove)
- [x] No visual jump during streaming → final transition
- [x] Build passes
- [x] localStorage persistence still works

## Testing
1. Send a message
2. Watch streaming — should see text appear in message list directly
3. When complete — no visual jump, same message element

## Files
- `src/lib/session-store.ts`

## Handoff
This is the critical fix for jumpiness. Update HANDOFF.md with the new streaming model.
