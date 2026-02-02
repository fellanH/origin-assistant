# UI Refactor — Handoff Document

> Context for agents working on the Origin UI refactoring project.

## Project Overview

**Goal:** Refactor the Origin chat UI from a prototype to a production-ready, snappy interface.

**Repository:** `/Users/admin/dev/origin/ui-next`  
**Main roadmap:** `../REFACTOR-ROADMAP.md`

## Current State (2026-02-02)

The UI works but has performance issues:
- Messages jump/animate on history load
- Session switching feels slow
- State management has too many subscriptions
- God component (page.tsx, 676 lines)
- Streaming has double-bubble issue

### Key Files

| File | Lines | Role |
|------|-------|------|
| `src/app/page.tsx` | 676 | Main page (god component) |
| `src/lib/session-store.ts` | 895 | Zustand state management |
| `src/lib/use-gateway.ts` | 217 | WebSocket connection + stats |
| `src/lib/use-session.ts` | 352 | Session hooks |
| `src/components/ai-elements/prompt-input.tsx` | 1263 | Input component |

### Architecture

```
Gateway (WebSocket)
    ↓
use-gateway.ts (connection, events)
    ↓
session-store.ts (Zustand store)
    ↓
use-session.ts (React hooks)
    ↓
page.tsx + components (render)
```

## Completed Tasks

### Task 1: Audit use-gateway.ts (2026-02-02)

Audited `src/lib/use-gateway.ts` (1335 lines) to identify used vs deprecated code.

**Findings:**
- **USED (keep):** `useGateway`, `useSessionStats` — used by `page.tsx`
- **DEPRECATED (remove):** `useOpenClawChat` (~800 lines) — replaced by `useSessionChat` from `use-session.ts`
- **DUPLICATED types:** `MessagePart`, `ChatMessage`, `ToolExecutionState`, `SubagentState`, `ChatStatus` — also defined in `session-store.ts`
- **INTERNAL helpers:** 5 functions only used by `useOpenClawChat`

**Recommendation:** Remove `useOpenClawChat` and duplicated types. After cleanup, file should shrink from ~1335 to ~200 lines.

**Output:** `tasks/AUDIT-use-gateway.md`

### Task 2: Remove Deprecated use-gateway Exports (2026-02-02)

Removed deprecated code from `src/lib/use-gateway.ts` based on Task 1 audit.

**Removed:**
- `useOpenClawChat` hook (~800 lines)
- 5 duplicated type definitions (`MessagePart`, `ChatMessage`, `ToolExecutionState`, `SubagentState`, `ChatStatus`)
- 4 internal helper functions (`normalizeRole`, `toStoredPart`, `parseHistoryMessage`, `extractParts`)

**Updated imports** in 3 consumer files to use `@/lib/use-session` instead:
- `src/components/ai-elements/message-parts.tsx`
- `src/components/ai-elements/subagent-artifact.tsx`
- `src/components/activity-bar.tsx`

**Kept:**
- `useGateway` — Core WebSocket connection hook
- `useSessionStats` — Token usage tracking hook

**Result:** File reduced from 1335 → 217 lines (84% reduction)

**Output:** `tasks/task-2.md`

### Task 3: Create Optimized Session Selector (2026-02-02)

Created `useSessionData` hook in `src/lib/use-session.ts` to replace 8+ individual `useSessionField` calls with a single optimized Zustand subscription.

**Implementation:**
- Added `useShallow` from `zustand/react/shallow` for shallow comparison
- Created `SessionDataResult` interface with all session fields
- Implemented cache for empty session defaults to prevent infinite re-render loops (per CLAUDE.md guidance)
- Hook returns: messages, status, streamingContent, error, historyLoading, historyLoaded, toolExecutions, subagents, messageQueue

**API:**
```typescript
import { useSessionData } from "@/lib/use-session";

const {
  messages,
  status,
  streamingContent,
  error,
  historyLoading,
  historyLoaded,
  toolExecutions,
  subagents,
  messageQueue,
} = useSessionData(sessionKey);
```

**Result:** Single subscription instead of 8+ separate subscriptions. Ready for consumer migration.

**Output:** `tasks/task-3.md`

### Task 4: Implement Inline Streaming Message Model (2026-02-02)

Fixed the "double bubble" streaming issue by making streaming content render inline in the message list instead of as a separate element.

**Problem:** During streaming, there was a separate DOM element for streaming content. When `final` arrived, that element disappeared AND a new message was added, causing a visual "jump".

**Solution:**
- Added `streamingMessageId: string | null` to `SessionData` interface
- On first delta: create a placeholder message in the messages array with a streaming ID
- On subsequent deltas: update the existing message in-place
- On final: update the existing streaming message to final state (no add/remove operation)
- On abort: update existing message with "[Aborted]" suffix
- On error: remove the streaming message (don't persist partial content)

**Changes to `src/lib/session-store.ts`:**
- Added `streamingMessageId` field to `SessionData` interface
- Updated `createEmptySession` to initialize `streamingMessageId: null`
- Updated `processChatEvent` delta case to create/update inline message
- Updated `processChatEvent` final case to update existing message instead of adding new
- Updated `processChatEvent` aborted case to update existing message
- Updated `processChatEvent` error case to remove streaming message and clear state

**Result:** No DOM operations during streaming→final transition. The same message element is updated in place, eliminating visual jumps.

**Output:** `tasks/task-4.md`

### Task 5: Create ChatProvider Context (2026-02-02)

Created `ChatProvider` context to extract session state management from `page.tsx` into a dedicated provider.

**Implementation:**
- Created `src/components/chat-provider.tsx` with full session management
- Uses `useSessionData` hook (from Task 3) for optimized Zustand subscription
- Provides all session data: messages, status, streamingContent, error, historyLoading, historyLoaded, toolExecutions, subagents, messageQueue
- Provides derived state: isStreaming, isSubmitted, canAbort, queueLength
- Provides actions: sendMessage, abort, regenerate, stopSubagent
- Handles history loading, session touch (LRU), message queue processing, and completion notifications

**API:**
```typescript
import { ChatProvider, useChatContext } from "@/components/chat-provider";

// Wrap component tree
<ChatProvider
  client={gatewayClient}
  sessionKey="agent:main:main"
  onMessageSent={() => console.log("sent")}
>
  <YourChatComponent />
</ChatProvider>

// Access context in descendants
const {
  // Identity
  sessionKey,
  // Data
  messages,
  status,
  streamingContent,
  error,
  historyLoading,
  historyLoaded,
  toolExecutions,
  subagents,
  messageQueue,
  // Derived
  isStreaming,
  isSubmitted,
  canAbort,
  queueLength,
  // Actions
  sendMessage,
  abort,
  regenerate,
  stopSubagent,
} = useChatContext();
```

**Also exported:** `useChatContextOptional()` — non-throwing version for conditional usage.

**Output:** `tasks/task-5.md`

### Task 6: Create ChatMessageList Component (2026-02-02)

Created `ChatMessageList` component to extract message list rendering from `page.tsx` with smart animation strategy.

**Problem:** In `page.tsx`, all messages animated on render including history load, causing visual jumpiness when switching sessions or loading history.

**Solution:**
- Created `src/components/chat-message-list.tsx` with animation tracking
- Uses refs to track: `initialLoadComplete`, `previousMessageCount`, `currentSessionKey`
- On session change: reset animation tracking
- On history load: mark initial load complete after first render with history
- Animation logic: only messages added after initial load animate in

**Animation Strategy:**
```typescript
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
  // History messages: no animation
  return { initial: false };
};
```

**Features:**
- Uses `useChatContext` for all session data (messages, status, toolExecutions, subagents, etc.)
- Memoized with `memo()` to prevent unnecessary re-renders
- Handles loading state (ConversationSkeleton)
- Handles empty state (EmptyState with suggestions)
- Renders streaming content, thinking indicator, and queued messages
- Supports subagent actions: view history, stop, navigate

**Props:**
```typescript
interface ChatMessageListProps {
  onCopy?: (content: string, messageId: string) => void;
  onRegenerate?: () => void;
  copiedId?: string | null;
  onSuggestionClick?: (suggestion: string) => void;
  onSubagentViewHistory?: (subagent: SubagentState) => void;
  onSubagentStop?: (subagent: SubagentState) => void;
  onSubagentNavigateToSession?: (sessionKey: string) => void;
}
```

**Result:** History loads instantly without animation cascade. Only new messages sent during the session animate in smoothly.

**Output:** `tasks/task-6.md`

## In Progress

*None*

## Task Dependencies

See REFACTOR-ROADMAP.md for full dependency graph.

**Phase 1** (sequential): 1.1 → 1.2 → 1.3  
**Phase 2+** (parallel tracks): See roadmap

## Guidelines for Agents

1. **Always check imports** — Moving code breaks imports
2. **Run `pnpm build`** — Must pass after each task
3. **Test in browser** — `pnpm dev` and verify functionality
4. **Small commits** — One commit per task
5. **Update this file** — Add completed task summary

## Commands

```bash
cd /Users/admin/dev/origin/ui-next
pnpm build      # TypeScript check
pnpm dev        # Dev server (localhost:3000)
pnpm lint       # Lint check
```

## Known Issues

- External agents list component was added but gateway build needed (separate build)
- See REVIEW-2026-02-02.md for code review findings

---

*Last updated: 2026-02-02*
