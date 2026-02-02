# Tasks: SubagentArtifact Component

> Atomic tasks for Phase 1.1 — SubagentArtifact component implementation.
> Each task is isolated and can be run by a sub-agent.

---

## Overview

Replace the current `subagent-card.tsx` with a new `SubagentArtifact` component that:
1. Uses Agent/Artifact ai-elements primitives
2. Persists after completion (doesn't disappear)
3. Shows result summary and expandable history
4. Integrates with message parts for persistence

**Reference files:**
- `src/components/ai-elements/agent.tsx` — Agent primitives
- `src/components/ai-elements/artifact.tsx` — Artifact primitives
- `src/components/ai-elements/subagent-card.tsx` — Current implementation (to replace)
- `src/lib/use-gateway.ts` — SubagentState type, tracking logic
- `src/components/ai-elements/message-parts.tsx` — Where subagents render

---

## Task 1: Create SubagentArtifact Base Component

**Status:** COMPLETE ✅

**Goal:** Create the new component file with basic structure using Agent/Artifact patterns.

**Files to create:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [x] Component renders with Agent-style header (icon, label, model badge)
- [x] Status badge shows current state (spawning/running/completed/error/timeout)
- [x] Status colors: blue (spawning), yellow (running), green (done), red (error), orange (timeout)
- [x] Live elapsed time counter (updates every second while active)
- [x] Uses Artifact container styling (border, shadow, sections)
- [x] Accepts same props as current SubagentCard (SubagentState + callbacks)
- [x] Exports as named export

**Notes:**
- Look at `subagent-card.tsx` for the statusConfig pattern
- Use `Agent` header style but don't need full Agent component (no tools/instructions)
- Keep the expand/collapse behavior from current implementation

**Completed:** 2026-02-02 — Includes collapsible TaskDescription with show more/less toggle

---

## Task 2: Add Task Description Section

**Status:** COMPLETE ✅
**Depends on:** Task 1

**Goal:** Add collapsible task description section below header.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [x] Task description shows in a muted background section
- [x] Long tasks (>100 chars) are truncated with "Show more" toggle
- [x] Collapsed by default when completed, expanded when running
- [x] Uses consistent typography with Agent instructions style

**Completed:** 2026-02-02 — Implemented as TaskDescription sub-component with maxLength prop

---

## Task 3: Add Result Summary Section

**Status:** COMPLETE ✅
**Depends on:** Task 1

**Goal:** Show a summary of what the subagent produced when completed.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`
- `src/lib/use-gateway.ts` (add resultSummary to SubagentState)

**Acceptance criteria:**
- [x] SubagentState type extended with `resultSummary?: string`
- [x] Result section only shows when status is completed
- [x] Result is extracted from subagent's final assistant message (first 200 chars)
- [x] Shows "No result captured" if empty
- [x] Styled distinctly from task description (success color tint)

**Completed:** 2026-02-02 — Added ResultSummary component with green success styling, truncation at 200 chars with expand toggle

**Notes:**
- The gateway sends subagent completion via `agent` events
- May need to fetch/extract result from the child session's last message
- For now, can store result when `sessions_spawn` tool returns

---

## Task 4: Add Expandable History Preview

**Status:** COMPLETE ✅
**Depends on:** Task 1, Task 3

**Goal:** Show inline preview of subagent conversation, expandable.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [x] "Conversation (N messages)" header with expand/collapse chevron
- [x] When expanded, shows condensed message list (role + truncated content)
- [x] Max 5 messages shown inline, "View full history" link for more
- [x] Messages styled minimally (not full Message components)
- [x] Only shows for completed subagents with history available

**Completed:** 2026-02-02 — Added HistoryPreview component with conversationHistory prop, expandable message list with User/Bot icons, 80 char truncation, and "View full history" link

**Notes:**
- History comes from `onViewHistory` callback or could fetch inline
- Consider lazy loading history only when expanded
- Keep it lightweight — this is a preview, not full chat

---

## Task 5: Add Action Buttons

**Status:** COMPLETE ✅
**Depends on:** Task 1

**Goal:** Add action buttons using Artifact action pattern.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [x] Actions row at bottom of artifact
- [x] "View History" button — always visible, opens full session
- [x] "Stop" button — only while running, calls onStop
- [x] "Copy Result" button — only when completed with result
- [x] Buttons use ArtifactAction style with tooltips
- [x] Icons: Eye (history), Square (stop), Copy (copy result)

**Completed:** 2026-02-02 — Added actions row at bottom of artifact using ArtifactActions/ArtifactAction with tooltips. Includes clipboard feedback (copied state) for Copy Result button.

---

## Task 6: Update message-parts.tsx Integration

**Status:** COMPLETE ✅
**Depends on:** Task 1-5

**Goal:** Replace SubagentCard with SubagentArtifact in message rendering.

**Files to modify:**
- `src/components/ai-elements/message-parts.tsx`

**Acceptance criteria:**
- [x] Import SubagentArtifact instead of SubagentCard
- [x] Render ALL subagents (not just active ones)
- [x] Completed subagents show with full artifact UI
- [x] Error boundaries still wrap the component
- [x] No visual regression for running subagents

**Completed:** 2026-02-02 — Replaced SubagentCard with SubagentArtifact in both rendering locations, removed status filter to show all subagents

---

## Task 7: Persist Subagents in Message Parts

**Status:** PENDING
**Depends on:** Task 6

**Goal:** Store subagent data in message.parts so they survive reload.

**Files to modify:**
- `src/lib/use-gateway.ts`
- `src/lib/storage.ts` (if needed)

**Acceptance criteria:**
- [ ] When subagent completes, add to message.parts as `type: 'subagent'`
- [ ] Subagent part includes: toolCallId, task, label, model, status, duration, resultSummary
- [ ] On history load, restore subagents from message.parts
- [ ] Subagent artifacts persist across page refresh
- [ ] No duplicate subagents (live state vs persisted)

**Notes:**
- Similar pattern to how tool_use/tool_result are persisted
- May need to update parseHistoryMessage to extract subagent parts

---

## Task 8: Remove Old SubagentCard

**Status:** PENDING
**Depends on:** Task 6, Task 7

**Goal:** Clean up old implementation.

**Files to modify/delete:**
- Delete `src/components/ai-elements/subagent-card.tsx`
- Update any other imports

**Acceptance criteria:**
- [ ] subagent-card.tsx deleted
- [ ] No remaining imports of SubagentCard
- [ ] No TypeScript errors
- [ ] All subagent functionality works with new component

---

## Build & Deploy Instructions

**The UI runs in production mode.** After completing each task:

1. **Run `pnpm build`** — Verify no TypeScript/build errors
2. **If build passes** — Felix can refresh browser to see changes
3. **If changes don't appear** — May need to restart the production server
4. **If still issues** — Clear `.next` cache: `rm -rf .next && pnpm build`

**Always run `pnpm build` before marking a task complete!**

---

## Testing Checklist

After all tasks complete:
- [ ] Spawn a subagent, verify it shows with running state
- [ ] Wait for completion, verify artifact stays visible
- [ ] Verify result summary appears
- [ ] Expand history preview
- [ ] Click "View History" to open full session
- [ ] Refresh page, verify subagent artifact persists
- [ ] Test error state (stop a running subagent)
- [ ] Test multiple concurrent subagents

---

## Merge Verification

**Status:** COMPLETE ✅
**Date:** 2026-02-02

Tasks 1-5 ran in parallel and all committed successfully. Post-merge verification confirmed:

- ✅ All features present in `subagent-artifact.tsx`
- ✅ Correct section order: Header → TaskDescription → ResultSummary → HistoryPreview → Actions
- ✅ `resultSummary?: string` present in SubagentState (use-gateway.ts)
- ✅ `pnpm build` passes with no errors
- ✅ No duplicate sections or broken imports

No merge conflicts or missing pieces detected. Component is ready for Task 6 (message-parts integration).

---

_Created: 2026-02-02_
