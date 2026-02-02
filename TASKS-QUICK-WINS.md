# Quick Wins — Code Review Cleanup

> Low-risk fixes from the 2026-02-02 code review. Each task is isolated and takes < 15 minutes.

---

## Task 1: Delete Dead SubagentCard Component

**Status:** COMPLETE ✅
**Effort:** 5 min
**Risk:** Low

**Goal:** Remove the old `subagent-card.tsx` that was replaced by `subagent-artifact.tsx`.

**Steps:**
1. Delete `ui-next/src/components/ai-elements/subagent-card.tsx`
2. Verify no remaining imports: `grep -r "subagent-card" ui-next/src/`
3. Run `pnpm build` to confirm no errors

**Acceptance criteria:**
- [ ] File deleted
- [ ] No import errors
- [ ] Build passes

---

## Task 2: Remove Duplicate formatDuration

**Status:** COMPLETE ✅
**Effort:** 5 min
**Risk:** Low

**Goal:** Remove the duplicate `formatDuration` function from `subagent-artifact.tsx` and import from `session-utils.ts`.

**File:** `ui-next/src/components/ai-elements/subagent-artifact.tsx`

**Steps:**
1. Add import: `import { formatDuration } from "@/lib/session-utils";`
2. Delete the local `formatDuration` function (around line 86)
3. Run `pnpm build` to confirm

**Acceptance criteria:**
- [ ] Local function removed
- [ ] Import added
- [ ] Build passes
- [ ] Duration displays correctly in UI

---

## Task 3: Remove Debug Console.log

**Status:** COMPLETE ✅
**Effort:** 1 min
**Risk:** None

**Goal:** Remove debug logging left in production code.

**File:** `ui-next/src/components/ai-elements/mic-selector.tsx`
**Line:** 230

**Steps:**
1. Find and remove: `console.log(matches, device.label);`
2. Run `pnpm build`

**Acceptance criteria:**
- [ ] Console.log removed
- [ ] Build passes

---

## Task 4: Add displayName to Artifact Components

**Status:** COMPLETE ✅
**Effort:** 5 min
**Risk:** None

**Goal:** Add `displayName` to all exported components in `artifact.tsx` for better debugging.

**File:** `ui-next/src/components/ai-elements/artifact.tsx`

**Steps:**
1. Add after each component definition:
```typescript
Artifact.displayName = "Artifact";
ArtifactHeader.displayName = "ArtifactHeader";
ArtifactTitle.displayName = "ArtifactTitle";
ArtifactActions.displayName = "ArtifactActions";
ArtifactAction.displayName = "ArtifactAction";
ArtifactContent.displayName = "ArtifactContent";
```
2. Run `pnpm build`

**Acceptance criteria:**
- [ ] All exports have displayName
- [ ] Build passes

---

## Task 5: Wrap Settings Panel in Error Boundary

**Status:** COMPLETE ✅
**Effort:** 10 min
**Risk:** Low

**Goal:** Add error boundary around the settings panel to prevent crashes from taking down the whole app.

**File:** `ui-next/src/app/page.tsx`

**Steps:**
1. Find the settings panel render (search for `showSettings`)
2. Wrap in `CompactErrorBoundary`:
```tsx
{showSettings && (
  <CompactErrorBoundary label="Settings">
    {/* existing settings panel JSX */}
  </CompactErrorBoundary>
)}
```
3. Run `pnpm build`

**Acceptance criteria:**
- [ ] Settings panel wrapped
- [ ] Build passes
- [ ] Settings still functional

---

## Task 6: Update Task Files for Consistency

**Status:** COMPLETE ✅
**Effort:** 5 min
**Risk:** None

**Goal:** Mark SubagentArtifact Task 8 as complete (after Task 1 above) and sync with ROADMAP.

**Files:**
- `ui-next/TASKS-SUBAGENT-ARTIFACT.md`
- `ROADMAP.md`

**Steps:**
1. After Task 1 is done, update TASKS-SUBAGENT-ARTIFACT.md:
   - Mark Task 8 status as COMPLETE ✅
   - Add completion date
   - Check all acceptance criteria
2. Update ROADMAP.md Phase 1.1 if needed
3. Add to Completed table in ROADMAP.md

**Acceptance criteria:**
- [ ] Task 8 marked complete with date
- [ ] ROADMAP reflects completion
- [ ] No contradictions between files

---

## Task 7: Add ESLint Disable Comments

**Status:** COMPLETE ✅
**Effort:** 10 min
**Risk:** None

**Goal:** Add explanatory comments to `eslint-disable` statements that lack context.

**Files:**
- `ui-next/src/lib/use-gateway.ts:163`
- `ui-next/src/app/page.tsx:110, 163`

**Steps:**
1. Find each `eslint-disable` without explanation
2. Add brief comment explaining WHY the rule is disabled
3. Example:
```typescript
// Effect needs to run on mount to initialize from localStorage
// eslint-disable-next-line react-hooks/set-state-in-effect
setMessages(localMessages);
```

**Acceptance criteria:**
- [ ] All eslint-disable have explanatory comments
- [ ] Comments are accurate and helpful

---

## Running These Tasks

These can be run in parallel by subagents or done manually.

**Parallel safe:** Tasks 1, 2, 3, 4, 7
**Sequential:** Task 5 (page.tsx), Task 6 (after Task 1)

**Command to verify all:**
```bash
cd /Users/admin/dev/origin/ui-next && pnpm build
```

---

_Created: 2026-02-02_
