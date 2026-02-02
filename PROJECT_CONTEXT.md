# Project Context — Cortana

> Personal AI assistant. Fork of OpenClaw, rebranded as "Cortana".

## Current State

**ui-next (Next.js)** — Primary focus
- ✅ Phase 1-3 complete (message model, tool events, session tree)
- ✅ 48 AI Elements components implemented
- ✅ Context/token display in header
- ✅ Subagent tracking with live status
- ⚠️ Some polish bugs (see BUGS-AND-POLISH.md)
- Build passing

**Next up:** Fix bugs, then Phase 4 layout redesign

## Active Bugs

1. **New session label** — Shows "agent session" instead of proper main session label
2. **Message display** — Occasional stray brackets, missing formatting (intermittent)

See `ui-next/BUGS-AND-POLISH.md` for details.

## Recent Decisions

- Using Vercel AI Elements component library
- Dual-stream architecture (chat + agent events)
- Hierarchical session sidebar (subagents nest under parents)
- Added proxy rule: always verify Claude Proxy before spawning subagents
- PROJECT_CONTEXT.md pattern for session handoffs

## Pickup

- [ ] Debug session label issue
- [ ] Debug message display issues
- [ ] Then Phase 4 layout redesign OR Neonode work

## TODO: Rebrand to Cortana

Rename from "OpenClaw fork" to "Cortana" throughout:
- [ ] Package names (`package.json`)
- [ ] UI strings and branding
- [ ] Documentation references
- [ ] Directory name? (`openclaw-fork` → `cortana`?)
- [ ] README and docs

*Some rebranding already done — needs thorough pass.*

## Key Files

| File | Purpose |
|------|---------|
| `ui-next/IMPROVEMENTS.md` | Full status + backlog |
| `ui-next/BUGS-AND-POLISH.md` | Active bugs + polish items |
| `ui-next/PHASE-4-LAYOUT-REDESIGN.md` | Next phase plan |
| `ui-next/src/app/page.tsx` | Main chat UI |
| `ui-next/src/lib/use-gateway.ts` | Gateway hooks |

## Open Questions

- Should subagent cards persist after completion or fade?
- Session tree expand/collapse state — sync across devices?

---
_Last updated: 2026-02-02 12:47_
