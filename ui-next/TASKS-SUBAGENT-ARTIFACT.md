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

**Status:** PENDING

**Goal:** Create the new component file with basic structure using Agent/Artifact patterns.

**Files to create:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [ ] Component renders with Agent-style header (icon, label, model badge)
- [ ] Status badge shows current state (spawning/running/completed/error/timeout)
- [ ] Status colors: blue (spawning), yellow (running), green (done), red (error), orange (timeout)
- [ ] Live elapsed time counter (updates every second while active)
- [ ] Uses Artifact container styling (border, shadow, sections)
- [ ] Accepts same props as current SubagentCard (SubagentState + callbacks)
- [ ] Exports as named export

**Notes:**
- Look at `subagent-card.tsx` for the statusConfig pattern
- Use `Agent` header style but don't need full Agent component (no tools/instructions)
- Keep the expand/collapse behavior from current implementation

---

## Task 2: Add Task Description Section

**Status:** PENDING
**Depends on:** Task 1

**Goal:** Add collapsible task description section below header.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [ ] Task description shows in a muted background section
- [ ] Long tasks (>100 chars) are truncated with "Show more" toggle
- [ ] Collapsed by default when completed, expanded when running
- [ ] Uses consistent typography with Agent instructions style

---

## Task 3: Add Result Summary Section

**Status:** PENDING
**Depends on:** Task 1

**Goal:** Show a summary of what the subagent produced when completed.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`
- `src/lib/use-gateway.ts` (add resultSummary to SubagentState)

**Acceptance criteria:**
- [ ] SubagentState type extended with `resultSummary?: string`
- [ ] Result section only shows when status is completed
- [ ] Result is extracted from subagent's final assistant message (first 200 chars)
- [ ] Shows "No result captured" if empty
- [ ] Styled distinctly from task description (success color tint)

**Notes:**
- The gateway sends subagent completion via `agent` events
- May need to fetch/extract result from the child session's last message
- For now, can store result when `sessions_spawn` tool returns

---

## Task 4: Add Expandable History Preview

**Status:** PENDING
**Depends on:** Task 1, Task 3

**Goal:** Show inline preview of subagent conversation, expandable.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [ ] "Conversation (N messages)" header with expand/collapse chevron
- [ ] When expanded, shows condensed message list (role + truncated content)
- [ ] Max 5 messages shown inline, "View full history" link for more
- [ ] Messages styled minimally (not full Message components)
- [ ] Only shows for completed subagents with history available

**Notes:**
- History comes from `onViewHistory` callback or could fetch inline
- Consider lazy loading history only when expanded
- Keep it lightweight — this is a preview, not full chat

---

## Task 5: Add Action Buttons

**Status:** PENDING
**Depends on:** Task 1

**Goal:** Add action buttons using Artifact action pattern.

**Files to modify:**
- `src/components/ai-elements/subagent-artifact.tsx`

**Acceptance criteria:**
- [ ] Actions row at bottom of artifact
- [ ] "View History" button — always visible, opens full session
- [ ] "Stop" button — only while running, calls onStop
- [ ] "Copy Result" button — only when completed with result
- [ ] Buttons use ArtifactAction style with tooltips
- [ ] Icons: Eye (history), Square (stop), Copy (copy result)

---

## Task 6: Update message-parts.tsx Integration

**Status:** PENDING
**Depends on:** Task 1-5

**Goal:** Replace SubagentCard with SubagentArtifact in message rendering.

**Files to modify:**
- `src/components/ai-elements/message-parts.tsx`

**Acceptance criteria:**
- [ ] Import SubagentArtifact instead of SubagentCard
- [ ] Render ALL subagents (not just active ones)
- [ ] Completed subagents show with full artifact UI
- [ ] Error boundaries still wrap the component
- [ ] No visual regression for running subagents

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

_Created: 2026-02-02_
