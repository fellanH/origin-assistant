# UI Refactoring Roadmap — Origin

> Major architectural refactor for a snappy, production-grade chat UI.
> Designed for parallel ralph agent execution.

## Vision

Transform the current prototype into a **fast, smooth, production-ready** chat interface:
- Instant session switching
- Zero visual jumping
- Smooth streaming with no flicker
- Proper loading states
- Clean separation of concerns

## Current Problems

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Jumpy animations | High | All messages animate on history load |
| Double streaming bubble | High | Separate streaming element + inline flag |
| Slow session switch | Medium | Animation + multiple state updates |
| God component (page.tsx) | High | 676 lines, 12+ useState, too many concerns |
| 8+ Zustand subscriptions | Medium | Individual field selectors cause re-renders |
| use-gateway.ts bloat | Low | 1335 lines, partially deprecated |
| prompt-input.tsx bloat | Low | 1263 lines, needs splitting |

---

## Phase 1: Foundation Cleanup (Day 1)
**Goal:** Remove dead code, establish clean baseline.

### Task 1.1: Audit use-gateway.ts
- [ ] Identify which functions are still used vs deprecated
- [ ] List all exports and their consumers
- [ ] Document what should stay vs be removed

**Files:** `src/lib/use-gateway.ts`
**Acceptance:** Markdown report of used vs unused exports

---

### Task 1.2: Remove deprecated use-gateway exports
- [ ] Remove unused functions identified in 1.1
- [ ] Update any remaining consumers
- [ ] Ensure build passes

**Files:** `src/lib/use-gateway.ts`, consumers
**Acceptance:** Build passes, file reduced significantly

---

### Task 1.3: Consolidate gateway types
- [ ] Create `src/lib/types.ts` for shared types
- [ ] Move `GatewayClient`, `GatewayEventFrame` etc
- [ ] Update imports across codebase

**Files:** New `src/lib/types.ts`, `src/lib/gateway.ts`
**Acceptance:** Types in one place, build passes

---

## Phase 2: State Management Refactor (Day 1-2)
**Goal:** Single source of truth, minimal re-renders.

### Task 2.1: Create optimized session selector
- [ ] Create `useSessionData(sessionKey)` hook that returns all needed data in one object
- [ ] Use shallow comparison for the combined object
- [ ] Memoize derived values

**Files:** `src/lib/use-session.ts`
**Acceptance:** Single hook replaces 8+ `useSessionField` calls

**Example:**
```typescript
export function useSessionData(sessionKey: string) {
  return useSessionStore(
    useShallow((state) => {
      const session = state.sessions.get(sessionKey);
      if (!session) return DEFAULT_SESSION_DATA;
      return {
        messages: session.messages,
        status: session.status,
        streamingContent: session.streamingContent,
        // ... all fields
      };
    })
  );
}
```

---

### Task 2.2: Implement streaming message model
- [ ] Add `streamingMessageId` to SessionData
- [ ] When streaming starts, create a placeholder message in `messages` array
- [ ] Update that message's content during deltas
- [ ] On `final`, just update the message (no add/remove)

**Files:** `src/lib/session-store.ts`
**Acceptance:** No separate streaming bubble needed, single message updates in place

---

### Task 2.3: Fix history loading race condition
- [ ] Add proper event queueing during `historyLoading`
- [ ] Process queued events in order after history loads
- [ ] Add tests for race condition scenarios

**Files:** `src/lib/session-store.ts`
**Acceptance:** Events during load are queued and processed correctly

---

### Task 2.4: Remove double persistence bug
- [ ] Audit all `addLocalMessage` calls
- [ ] Ensure messages are only persisted once
- [ ] Add deduplication by message ID

**Files:** `src/lib/session-store.ts`, `src/lib/storage.ts`
**Acceptance:** No duplicate messages in localStorage

---

## Phase 3: Component Architecture (Day 2-3)
**Goal:** Extract god component, clean separation.

### Task 3.1: Create ChatProvider context
- [ ] Extract session state management from page.tsx
- [ ] Create `ChatProvider` with context
- [ ] Expose `useChatContext()` hook

**Files:** New `src/components/chat-provider.tsx`
**Acceptance:** State logic moved out of page.tsx

**Interface:**
```typescript
interface ChatContextValue {
  sessionKey: string;
  messages: ChatMessage[];
  status: ChatStatus;
  streamingContent: string;
  sendMessage: (content: string) => Promise<void>;
  abort: () => Promise<void>;
  // ... etc
}
```

---

### Task 3.2: Create ChatMessageList component
- [ ] Extract message rendering from page.tsx
- [ ] Handle animation strategy (only new messages animate)
- [ ] Implement virtualization prep (react-window ready)

**Files:** New `src/components/chat-message-list.tsx`
**Acceptance:** Message list is self-contained component

---

### Task 3.3: Create ChatInput component wrapper
- [ ] Create thin wrapper around PromptInput
- [ ] Connect to ChatProvider context
- [ ] Handle submit, abort, attachments

**Files:** New `src/components/chat-input.tsx`
**Acceptance:** Input logic separated from page.tsx

---

### Task 3.4: Refactor page.tsx to composition
- [ ] Use ChatProvider, ChatMessageList, ChatInput
- [ ] page.tsx becomes layout orchestrator only
- [ ] Target: < 200 lines

**Files:** `src/app/page.tsx`
**Acceptance:** page.tsx under 200 lines, uses extracted components

---

## Phase 4: Animation & UX Polish (Day 3)
**Goal:** Smooth, snappy interactions.

### Task 4.1: Implement smart animation strategy
- [ ] Only animate messages added AFTER initial render
- [ ] Track `initialLoadComplete` flag per session
- [ ] Use CSS transitions for streaming updates (not motion)

**Files:** `src/components/chat-message-list.tsx`
**Acceptance:** History loads instantly, new messages animate smoothly

**Implementation:**
```typescript
const initialLoadRef = useRef(false);
useEffect(() => {
  if (historyLoaded) {
    // Small delay to mark initial load complete
    requestAnimationFrame(() => {
      initialLoadRef.current = true;
    });
  }
}, [historyLoaded]);

// In render:
<motion.div
  initial={initialLoadRef.current ? { opacity: 0, y: 10 } : false}
  // ...
>
```

---

### Task 4.2: Smooth session switching
- [ ] Preserve scroll position per session (already exists, verify working)
- [ ] Instant content swap (no fade)
- [ ] Loading skeleton only for empty sessions

**Files:** `src/components/chat-message-list.tsx`, `src/components/session-scroll-handler.tsx`
**Acceptance:** Session switch feels instant

---

### Task 4.3: Streaming UX improvements
- [ ] Cursor blink at end of streaming text
- [ ] Smooth text appearance (no jumping)
- [ ] Tool execution inline with streaming

**Files:** `src/components/ai-elements/message-parts.tsx`
**Acceptance:** Streaming feels smooth and polished

---

### Task 4.4: Loading state polish
- [ ] Skeleton matches message shape
- [ ] Shimmer animation
- [ ] Graceful transitions between states

**Files:** `src/components/ai-elements/message-skeleton.tsx`
**Acceptance:** Loading states are polished, no flicker

---

## Phase 5: prompt-input.tsx Refactor (Day 4)
**Goal:** Split 1263-line component into manageable pieces.

### Task 5.1: Extract attachment handling
- [ ] Create `useAttachments` hook
- [ ] Move attachment UI to separate component
- [ ] Handle file selection, preview, removal

**Files:** New `src/components/chat-input/use-attachments.ts`, `attachment-preview.tsx`
**Acceptance:** Attachment logic extracted, < 200 lines

---

### Task 5.2: Extract voice input handling
- [ ] Move speech recognition logic to hook
- [ ] Create VoiceInputButton component
- [ ] Handle recording state, transcription

**Files:** New `src/components/chat-input/use-voice-input.ts`, `voice-input-button.tsx`
**Acceptance:** Voice logic extracted, < 150 lines

---

### Task 5.3: Extract mention/command handling
- [ ] Move @mention and /command logic to hook
- [ ] Create suggestion dropdown component
- [ ] Handle keyboard navigation

**Files:** New `src/components/chat-input/use-mentions.ts`, `mention-dropdown.tsx`
**Acceptance:** Mention logic extracted, < 200 lines

---

### Task 5.4: Compose PromptInput from parts
- [ ] Refactor PromptInput to use extracted hooks/components
- [ ] Target: < 400 lines for main component
- [ ] Clean props interface

**Files:** `src/components/ai-elements/prompt-input.tsx`
**Acceptance:** Under 400 lines, uses extracted modules

---

## Phase 6: Testing & Documentation (Day 5)
**Goal:** Confidence in the refactored code.

### Task 6.1: Add session-store tests
- [ ] Test message flow (send → streaming → final)
- [ ] Test history loading
- [ ] Test session switching
- [ ] Test edge cases (abort, error, queue)

**Files:** New `src/lib/session-store.test.ts`
**Acceptance:** Core state management covered

---

### Task 6.2: Add integration tests
- [ ] Test full message send/receive flow
- [ ] Test session creation/switching
- [ ] Mock WebSocket events

**Files:** New `src/lib/integration.test.ts`
**Acceptance:** Key user flows tested

---

### Task 6.3: Document architecture
- [ ] Create ARCHITECTURE.md
- [ ] Document state flow
- [ ] Document component hierarchy
- [ ] Document event handling

**Files:** New `ARCHITECTURE.md`
**Acceptance:** New developers can understand the codebase

---

## Task Dependencies

```
Phase 1 (Foundation)
├── 1.1 → 1.2 → 1.3

Phase 2 (State) - can start after 1.3
├── 2.1 (independent)
├── 2.2 (independent)
├── 2.3 (independent)
├── 2.4 (independent)

Phase 3 (Components) - needs 2.1, 2.2
├── 3.1 → 3.2 → 3.4
├── 3.3 → 3.4

Phase 4 (Polish) - needs 3.2
├── 4.1 → 4.2
├── 4.3 (needs 2.2)
├── 4.4 (independent)

Phase 5 (prompt-input) - independent, can run parallel
├── 5.1 → 5.4
├── 5.2 → 5.4
├── 5.3 → 5.4

Phase 6 (Testing) - after all others
├── 6.1, 6.2, 6.3 (parallel)
```

---

## Parallel Execution Plan

**Track A (State):** 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 3.1
**Track B (Components):** 2.3 → 2.4 → 3.2 → 3.3 → 3.4
**Track C (Input):** 5.1 → 5.2 → 5.3 → 5.4
**Track D (Polish):** 4.1 → 4.2 → 4.3 → 4.4
**Track E (Testing):** 6.1 → 6.2 → 6.3

Max parallelism: 3 agents after Phase 1 completes.

---

## Success Metrics

- [ ] page.tsx under 200 lines
- [ ] prompt-input.tsx under 400 lines
- [ ] Session switch < 100ms perceived
- [ ] No animation on history load
- [ ] Zero visual jumping during streaming
- [ ] Build time maintained or improved
- [ ] All existing functionality preserved

---

## Files to Create

```
src/
├── lib/
│   ├── types.ts (new)
│   └── session-store.test.ts (new)
├── components/
│   ├── chat-provider.tsx (new)
│   ├── chat-message-list.tsx (new)
│   ├── chat-input.tsx (new)
│   └── chat-input/
│       ├── use-attachments.ts (new)
│       ├── use-voice-input.ts (new)
│       ├── use-mentions.ts (new)
│       ├── attachment-preview.tsx (new)
│       ├── voice-input-button.tsx (new)
│       └── mention-dropdown.tsx (new)
ARCHITECTURE.md (new)
```

---

## Notes for Agents

1. **Always check imports** — When moving code, update all import paths
2. **Preserve functionality** — Each task should maintain existing behavior
3. **Run build after each task** — `pnpm build` must pass
4. **Test in browser** — Key flows should work after each phase
5. **Commit after each task** — Small, atomic commits

---

*Created: 2026-02-02*
*Target completion: 5 days with parallel agents*
