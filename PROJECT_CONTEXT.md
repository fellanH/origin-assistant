# Project Context — Origin

> Personal AI assistant. Fork of OpenClaw, rebranded as "Origin".

## Current State

**ui-next (Next.js)** — Primary focus
- ✅ Phase 1-4 complete (message model, tool events, session tree, layout)
- ✅ 48 AI Elements components implemented
- ✅ Session model fixed: all chats equal, auto-naming, clear session
- ✅ Responsive sidebar (mobile/tablet)
- Build passing

**Backend** — Full access to OpenClaw source:
- `src/gateway/` — WebSocket server, routing
- `src/agents/` — Orchestration, subagents, tools
- `src/sessions/` — Session management

## Recent Session (18:04)

Completed:
- Removed "Main Chat" special status — all sessions equal
- Auto-naming from first user message
- Clear session action (eraser icon)
- Any session can be deleted

In progress discussion:
- Message queueing (send while processing)
- Activity status bar (show background state)
- Better loading/feedback states

## Pickup

- [ ] Test session model changes
- [ ] Add message queue UI
- [ ] Add activity status bar
- [ ] Demo to colleague tomorrow

## Key Files

| File | Purpose |
|------|---------|
| `ui-next/IMPROVEMENTS.md` | Full status + backlog |
| `ui-next/BUGS-AND-POLISH.md` | Active bugs + session model improvements |
| `ui-next/src/app/page.tsx` | Main chat UI |
| `ui-next/src/lib/use-gateway.ts` | Gateway hooks, auto-naming |
| `ui-next/src/lib/storage.ts` | Session storage, clear/update |

## Backend Deep Dive (Future)

Key files for agent orchestration:
- `src/agents/lanes.ts` — Concurrency control
- `src/agents/subagent-registry.ts` — Subagent lifecycle
- `src/agents/pi-embedded-runner.ts` — Main agent loop

---
_Last updated: 2026-02-02 18:05_
