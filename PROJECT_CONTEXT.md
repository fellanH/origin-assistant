# Project Context — Cortana

> Personal AI assistant. Fork of OpenClaw, rebranded as "Cortana".

## Current State

**ui-next (Next.js)** — Primary focus
- ✅ Phase 1-4 complete (message model, tool events, session tree, layout redesign)
- ✅ 48 AI Elements components implemented
- ✅ Sidebar-centric layout (header + input in sidebar, full-height chat)
- ✅ Context/token display in sidebar header
- ✅ Subagent tracking with live status
- Build passing, ready for testing

**Next up:** Responsive behavior (mobile) or Rebrand pass

## Recent Decisions

- Using Vercel AI Elements component library
- Dual-stream architecture (chat + agent events)
- Hierarchical session sidebar (subagents nest under parents)
- Added proxy rule: always verify Claude Proxy before spawning subagents

## Pickup

- [ ] Test sidebar-centric layout with live gateway
- [ ] Add responsive behavior (mobile sidebar overlay)
- [ ] Rebrand pass (package names, UI strings, directory rename)

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
| `ui-next/src/app/page.tsx` | Main chat UI (sidebar-centric) |
| `ui-next/src/components/sidebar-header.tsx` | Sidebar header (logo, status, settings) |
| `ui-next/src/components/sidebar-input.tsx` | Sidebar chat input |
| `ui-next/src/lib/use-gateway.ts` | Gateway hooks |

## Open Questions

- Should subagent cards persist after completion or fade?
- Session tree expand/collapse state — sync across devices?

---
_Last updated: 2026-02-02 12:30_
