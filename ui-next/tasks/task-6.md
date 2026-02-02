# Task 6: Create ChatMessageList Component

## Status: COMPLETE

## Objective
Extract message list rendering from `page.tsx` into a dedicated component with proper animation strategy.

## Prerequisites
- Task 4 (inline streaming) should be complete
- Task 5 (ChatProvider) should be complete

## Current Problem
In `page.tsx`, messages render with animation:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
```
This animates ALL messages including history load, causing jumpiness.

## Requirements

### 1. Create ChatMessageList component
Create `src/components/chat-message-list.tsx`:

```typescript
"use client";

import { useRef, useEffect, memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useChatContext } from "./chat-provider";
import { Message, MessageContent, MessageActions, MessageAction } from "./ai-elements/message";
import { MessageParts } from "./ai-elements/message-parts";
import { MessageSkeleton } from "./ai-elements/message-skeleton";
// ... other imports

interface ChatMessageListProps {
  onCopy?: (content: string, messageId: string) => void;
  onRegenerate?: () => void;
  copiedId?: string | null;
}

export const ChatMessageList = memo(function ChatMessageList({
  onCopy,
  onRegenerate,
  copiedId,
}: ChatMessageListProps) {
  const {
    messages,
    status,
    historyLoading,
    historyLoaded,
    toolExecutions,
    subagents,
  } = useChatContext();
  
  // Track if initial load is complete
  const initialLoadComplete = useRef(false);
  const previousMessageCount = useRef(0);
  
  useEffect(() => {
    if (historyLoaded && !initialLoadComplete.current) {
      // Mark initial load complete after first render with history
      requestAnimationFrame(() => {
        initialLoadComplete.current = true;
        previousMessageCount.current = messages.length;
      });
    }
  }, [historyLoaded, messages.length]);
  
  // Determine which messages are "new" (added after initial load)
  const getMessageAnimation = (index: number) => {
    // Don't animate during initial load
    if (!initialLoadComplete.current) {
      return { initial: false };
    }
    
    // Only animate messages added after initial load
    if (index >= previousMessageCount.current) {
      return {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
      };
    }
    
    return { initial: false };
  };
  
  // Update previous count when messages change
  useEffect(() => {
    if (initialLoadComplete.current) {
      previousMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Loading skeleton
  if (historyLoading && messages.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </div>
    );
  }
  
  // Empty state
  if (messages.length === 0 && status !== "submitted") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Start a conversation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isLatestAssistant =
          message.role === "assistant" && index === messages.length - 1;
        const animation = getMessageAnimation(index);
        
        return (
          <motion.div
            key={message.id}
            {...animation}
          >
            <Message from={message.role}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <MessageParts
                    content={message.content}
                    parts={message.parts}
                    isStreaming={isLatestAssistant && status === "streaming"}
                    toolExecutions={isLatestAssistant ? toolExecutions : undefined}
                    subagents={isLatestAssistant ? subagents : undefined}
                  />
                ) : (
                  <div>{message.content}</div>
                )}
              </MessageContent>
              {isLatestAssistant && status === "idle" && (
                <MessageActions>
                  <MessageAction onClick={onRegenerate} label="Regenerate">
                    ↻
                  </MessageAction>
                  <MessageAction
                    onClick={() => onCopy?.(message.content, message.id)}
                    label={copiedId === message.id ? "Copied!" : "Copy"}
                  >
                    {copiedId === message.id ? "✓" : "📋"}
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          </motion.div>
        );
      })}
      
      {/* Submitted indicator */}
      {status === "submitted" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <MessageSkeleton />
        </motion.div>
      )}
    </div>
  );
});
```

### 2. Key features
- **Smart animation:** Only new messages animate, not history
- **Uses ChatProvider:** Gets data from context
- **Memoized:** Prevents unnecessary re-renders
- **Clean separation:** Just rendering, no state management

### 3. Build must pass

## Success Criteria
- [x] ChatMessageList component created
- [x] Only new messages animate (not history)
- [x] Uses ChatProvider context
- [x] Build passes
- [x] Handles loading/empty states

## Testing
1. Load a session with history — messages should appear instantly
2. Send a new message — only new messages should animate in
3. Switch sessions — no animation cascade

## Files
- Create: `src/components/chat-message-list.tsx`

## Handoff
Document the animation strategy in HANDOFF.md.
