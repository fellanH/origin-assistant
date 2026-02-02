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

## Active Work: SubagentArtifact (Phase 1.1)

**Problem:** Subagents disappear after completion, no visibility into what they did.

**Solution:** New `SubagentArtifact` component using Agent/Artifact primitives.

**Tasks file:** `ui-next/TASKS-SUBAGENT-ARTIFACT.md`

| Task | Description | Status |
|------|-------------|--------|
| 1 | Base component with Agent/Artifact patterns | PENDING |
| 2 | Task description section | PENDING |
| 3 | Result summary section | PENDING |
| 4 | Expandable history preview | PENDING |
| 5 | Action buttons | PENDING |
| 6 | message-parts.tsx integration | PENDING |
| 7 | Persist in message parts | PENDING |
| 8 | Remove old SubagentCard | PENDING |

## Pickup

- [ ] Run sub-agents on Tasks 1-5 (can parallelize 2-5 after 1)
- [ ] Then Tasks 6-7 sequentially
- [ ] Task 8 last (cleanup)
- [ ] Demo to colleague (TBD)

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Full project roadmap and vision |
| `ui-next/TASKS-SUBAGENT-ARTIFACT.md` | Atomic tasks for current work |
| `ui-next/IMPROVEMENTS.md` | Full status + backlog |
| `ui-next/BUGS-AND-POLISH.md` | Active bugs + polish items |
| `ui-next/src/components/ai-elements/agent.tsx` | Agent component primitives |
| `ui-next/src/components/ai-elements/artifact.tsx` | Artifact component primitives |
| `ui-next/src/components/ai-elements/subagent-card.tsx` | Current impl (to replace) |
| `ui-next/src/lib/use-gateway.ts` | SubagentState, tracking logic |

## Related: Ralph-Loop

Origin's subagent system is essentially a built-in ralph-loop. See:
- `memory/autonomous-coding-philosophy.md` — The pattern
- `/Users/admin/dev/software-ralph-loop/` — External implementation

Vision: Origin becomes a **visual ralph-loop** with task queues, batch spawning, and orchestration UI.

---
_Last updated: 2026-02-02 18:30_
