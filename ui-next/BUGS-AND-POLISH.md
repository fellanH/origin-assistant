# Bugs & Polish — Origin UI

> Tracking issues for final cleanup. Most things work well — these are edge cases and polish items.

---

## 🐛 Active Bugs

### 1. Message Display Misalignment — UNDER INVESTIGATION

**Problem:** Messages sometimes display with:
- Stray brackets (e.g., `]` appearing alone)
- No formatting (raw text instead of markdown)
- Misaligned content

**When it happens:** Intermittent — most of the time it works fine

**Investigation (2026-02-02):**

Traced the complete data flow from gateway to rendering:

1. **Dual-Stream Architecture:**
   - `chat` events → text only (delta → final)
   - `agent` events → structured tool data (tool phases)
   - `loadHistory` RPC → full structured content arrays

2. **Defensive Fixes Applied:**
   - Added guards in `extractText`, `parseHistoryMessage`, `extractParts` to skip non-object content blocks
   - Added development-only console warnings for malformed data
   - These prevent raw strings (like stray `]`) from leaking through

3. **Key Findings:**
   - `final` events only contain text, not tool parts
   - Tool calls tracked separately via `toolExecutions` state
   - History endpoint returns fully structured messages

4. **Remaining Hypotheses:**
   - Gateway or storage occasionally sends malformed content blocks
   - Race condition between history load and live events when switching sessions
   - Streamdown markdown parser edge cases with certain content patterns
   - Multiple text parts in a message creating separate DOM wrappers

**Files Modified:**
- `src/lib/use-gateway.ts` — Added defensive checks + dev warnings
- `src/components/ai-elements/message-parts.tsx` — Added warning for unknown part types

**Next Steps:**
1. Monitor browser console in development for warnings
2. If warnings appear, they'll reveal the exact malformed data
3. Consider adding error boundaries around message rendering

---

## 🎯 Session Model Improvements (Priority for Demo)

### Goal: All Chats Are Equal (Option B)

Remove the special "Main Chat" concept. All sessions are equal, named by content.

### 1. Auto-naming Sessions

**Problem:** Sessions are named "Chat" or generic IDs

**Solution:** 
- After first few messages, spawn a lightweight agent (Haiku) to generate a title
- Or use simple heuristic: first user message truncated to ~30 chars

**Implementation:**
- Hook into `useOpenClawChat` after message count reaches 2-3
- Call naming function (local heuristic or API)
- Update session label in storage

### 2. Clear/Reset Session

**Problem:** No way to clear a session's history and start fresh

**Solution:**
- Add "Clear" button to session actions
- Clears messages but keeps the session
- Or: Delete session + create new one with same key

### 3. Subagent Nesting Under Actual Parent

**Problem:** Subagents currently default to nesting under `agent:main:main`

**Status:** ✅ FIXED — `parentSessionKey` tracking added

**Verify:** When spawning subagent from a non-main session, it should nest under that session.

### 4. Remove "Main Chat" Special Status

**Problem:** `agent:main:main` is treated as special/permanent

**Solution:**
- Allow deletion of any session
- First session created becomes "default" but not special
- Update `parseSessionKey` to not give `main` special treatment in display

---

## 🔍 Debug Checklist

When investigating message issues:

1. **Check browser console** for errors
2. **Check gateway WebSocket** — Network tab → WS → Messages
3. **Log the message object:**
   ```typescript
   console.log('Message:', JSON.stringify(message, null, 2));
   console.log('Parts:', message.parts);
   ```
4. **Check if it's streaming vs persisted** — Issue during live stream or after reload?
5. **Check content array structure** — Does gateway send expected format?

---

## ✅ Fixed (Reference)

| Issue | Fix | Date |
|-------|-----|------|
| Subagent tree nesting | Added parentSessionKey tracking - subagents now nest under actual parent | 2026-02-02 |
| Duplicate sparkle icon | Removed old SparklesIcon from session tree items | 2026-02-02 |
| New session label | Fixed `generateSessionLabel` to return "New Chat" for `agent:main:<timestamp>` patterns | 2026-02-02 |
| Stop button behavior | Consolidated into single PromptInputSubmit with status/onStop | 2026-02-02 |
| Text overflow in input | Added min-w-0 to flex container | 2026-02-02 |
| Loading state transitions | Added skeleton loaders, AnimatePresence transitions, thinking indicator | 2026-02-02 |
| Error boundaries | Added ErrorBoundary components with graceful fallbacks | 2026-02-02 |
| Empty state | Extracted to dedicated component with smooth animations | 2026-02-02 |

---

## 📝 Polish Items

- [x] Loading states — smoother transitions ✅
- [x] Error boundaries — graceful fallbacks for rendering errors ✅
- [x] Empty state refinement ✅
- [ ] Consistent spacing/padding review
- [ ] Dark mode contrast check

---

_Last updated: 2026-02-02 13:25_
## Bug: UI error on agent spawn (2026-02-03 00:04)

- **What:** Error in UI when spawning multiple subagents
- **Observed:** Agents appear in sidebar and seem to run despite error
- **Reproduce:** Spawn 3 agents in quick succession via sessions_spawn
- **Priority:** Medium (doesn't block functionality)

