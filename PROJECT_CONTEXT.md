# Project Context — Origin

> Personal AI assistant. Fork of OpenClaw, rebranded as "Origin".

## Current State

**ui-next (Next.js)** — Primary focus
- ✅ Phase 1-4 complete (message model, tool events, session tree, layout)
- ✅ 48 AI Elements components implemented
- ✅ Session model fixed: all chats equal, auto-naming, clear session
- ✅ Responsive sidebar (mobile/tablet)
- ✅ ROADMAP.md created with vision and phased plan
- 🔄 SubagentArtifact component — atomic tasks defined
- Build passing

**Backend** — Full access to OpenClaw source:
- `src/gateway/` — WebSocket server, routing
- `src/agents/` — Orchestration, subagents, tools
- `src/sessions/` — Session management

## Active Work: Post-Review Cleanup

**Code Review (2026-02-02):** 4 senior agents reviewed backend, UI, data flow, and code quality.

### Critical Findings

| Area | Issue | Priority |
|------|-------|----------|
| Data Flow | Race condition: history load vs WebSocket events | 🔴 |
| Data Flow | Stale closure in subagent persistence | 🔴 |
| Data Flow | Double persistence bug | 🔴 |
| UI | God component (`page.tsx` with 30+ useState) | 🔴 |
| Backend | Race condition in bash-process-registry | 🔴 |
| Backend | Memory leak in subagent-registry | 🔴 |

### SubagentArtifact (Phase 1.1) — Nearly Complete

| Task | Status |
|------|--------|
| Tasks 1-7 | ✅ Complete |
| Task 8: Delete old SubagentCard | 🔲 Pending (5 min) |

## Pickup

- [ ] Complete Task 8 (delete subagent-card.tsx) — 5 min
- [ ] Quick wins from code review — see `REVIEW-2026-02-02.md`
- [ ] State management fixes (Batch 1) — critical race conditions
- [ ] Component architecture refactor (Batch 2) — ChatProvider context

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Full project roadmap and vision |
| `REVIEW-2026-02-02.md` | **Code review findings + action list** |
| `ui-next/TASKS-SUBAGENT-ARTIFACT.md` | Atomic tasks for SubagentArtifact (7/8 done) |
| `ui-next/IMPROVEMENTS.md` | Full status + backlog |
| `ui-next/BUGS-AND-POLISH.md` | Active bugs + polish items |
| `ui-next/src/components/ai-elements/subagent-artifact.tsx` | New subagent component |
| `ui-next/src/lib/use-gateway.ts` | SubagentState, tracking logic (needs refactor) |

## Related: Ralph-Loop

Origin's subagent system is essentially a built-in ralph-loop. See:
- `memory/autonomous-coding-philosophy.md` — The pattern
- `/Users/admin/dev/software-ralph-loop/` — External implementation

Vision: Origin becomes a **visual ralph-loop** with task queues, batch spawning, and orchestration UI.

---
_Last updated: 2026-02-02 18:30_
