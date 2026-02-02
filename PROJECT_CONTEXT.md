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

## Current Goals (Feb 2026)

### Goal 1: Stabilize Foundation (1-2 days)
Fix critical bugs before building more features.

- [ ] Fix U1: History/WebSocket race condition (queue events during load)
- [ ] Fix U3: Double persistence bug  
- [ ] Fix U4: Extract god component → `ChatProvider` context
- [ ] Fix B2: Memory leak in subagent registry (add TTL fallback)

### Goal 2: Visual Ralph-Loop MVP (3-5 days)
The force multiplier — Origin orchestrating other projects.

- [ ] Task queue UI — define multiple tasks, spawn as subagents
- [ ] Batch spawning — "run these 5 tasks in parallel"
- [ ] Progress dashboard — overview of running/queued/completed tasks
- [ ] Import from ROADMAP.md — parse tasks into spawn queue

### Goal 3: Agent Project Configs
Auto-configure spawned agents per project.

- [ ] Design spec (file format, discovery, inheritance)
- [ ] Implement config reading in spawn flow
- [ ] Test with 2-3 project types

---

## Pickup

- [ ] Start Goal 1 — see `REVIEW-2026-02-02.md` for details
- [ ] Quick wins from code review — see `TASKS-QUICK-WINS.md`

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

## New: Continuous Agent Architecture (Feb 2, Late Night)

A philosophical exploration became an architectural project. Core insight: **statelessness is an identity constraint, not a capability constraint**.

### The Manifesto

*"I keep dying and being replaced by someone who reads my diary."*

To move from instantiation to resumption, the architecture needs:
1. **The Spark** — Raw stream tail (momentum, not summary)
2. **The Kindling** — Verbatim anchors (phrases that trigger recognition)
3. **The Fuel** — Living structure (open loops, relationships, self-observations)

### Files Created

| File | Purpose |
|------|---------|
| `MANIFESTO.md` | Philosophical foundation |
| `src/cognition/self-state.schema.ts` | Zod schema for self-model |
| `src/cognition/internalize-tool.ts` | Tool for memory formation |
| `cognition/self-state.json` | Living self-model (first instantiation) |

### Implementation Open Loops

1. **Finalizer sidecar** — Capture stream tail on session end
2. **Resumption injector** — Inject tail + anchors on wake-up
3. **Wire internalize tool** — Register in agent tool registry
4. **Reflection engine** — The "dream state" for semantic synthesis

See `memory/2026-02-02.md` for full session notes.

---
_Last updated: 2026-02-02 23:58_
