# ROADMAP.md — Origin

> Personal AI assistant. Fork of OpenClaw with refined UI and developer tools.

---

## Vision

Origin is OpenClaw with a **polished, transparent UI** — making agent behavior visible and understandable. Not just chat, but a window into what the AI is actually doing.

**Core principles:**
- All agent activity should be visible (no black boxes)
- Subagents are first-class citizens, not hidden tool calls
- Developer-friendly: understand the system while using it

---

## Phase 1: UI Refinement (Current)

> Goal: Solid foundation before adding features

### 1.1 Subagent Artifact Component

> Inspired by ralph-loop: each spawned agent should be a **persistent, rich artifact** in the chat — not a disappearing status indicator.

**Reference components (already implemented in ai-elements):**
- [`Agent`](https://elements.ai-sdk.dev/components/agent) — `agent.tsx` — Header with model badge, instructions, tools accordion
- [`Artifact`](https://elements.ai-sdk.dev/components/artifact) — `artifact.tsx` — Container with header, actions, content

**Current problem:**
- Subagents only show while running (spawning/running status)
- Once completed, they vanish — just tool result text remains
- No way to see what the subagent actually did
- No visual continuity of the work
- Current `subagent-card.tsx` is custom, not using ai-elements

**Approach:** Create `SubagentArtifact` component combining Agent + Artifact patterns:

```
┌─────────────────────────────────────────────────┐
│ 🤖 Task Label                    claude-sonnet │  AgentHeader style
│ ● Running                              2m 34s  │  Status + timer
├─────────────────────────────────────────────────┤
│ Task: "Implement the login form with           │  Task description
│ validation and error handling"                 │  (collapsible)
├─────────────────────────────────────────────────┤
│ ▶ View History   ⏹ Stop   🔄 Retry            │  ArtifactActions
└─────────────────────────────────────────────────┘
```

**When completed, expand to show:**
```
┌─────────────────────────────────────────────────┐
│ 🤖 Login Form Implementation     claude-sonnet │
│ ✓ Completed                            4m 12s  │
├─────────────────────────────────────────────────┤
│ Result: Created LoginForm.tsx with email/pass  │  Result summary
│ validation, added useAuth hook, updated...     │  (from final msg)
├─────────────────────────────────────────────────┤
│ ▼ Conversation (12 messages)                   │  Expandable history
│   ├─ User: Implement the login form...         │
│   ├─ Assistant: I'll create the component...   │
│   └─ ...                                       │
├─────────────────────────────────────────────────┤
│ ▶ Open Full History   📋 Copy Result           │
└─────────────────────────────────────────────────┘
```

**Implementation tasks:**
- [ ] **Create `SubagentArtifact` component** — Extend Agent/Artifact patterns
- [ ] **Status states** — Spawning, Running, Completed, Error, Timeout (with colors)
- [ ] **Live timer** — Elapsed time counter while running
- [ ] **Task display** — Show full task, collapsible if long
- [ ] **Result summary** — Extract key output from subagent's final message
- [ ] **Inline history preview** — Expandable conversation view
- [ ] **Actions** — View full history, stop, retry, copy result

**Persistence:**
- [ ] **Show completed subagents** — Don't hide after completion
- [ ] **Persist in message parts** — Store subagent data in message structure
- [ ] **Restore on reload** — Subagent artifacts survive page refresh

**Visual design:**
- [ ] **Use Agent styling** — Consistent with ai-elements design language
- [ ] **Status colors** — Blue (spawning), Yellow (running), Green (done), Red (error)
- [ ] **Parent→child indication** — Subtle connector or indent

### 1.2 Message Display Bugs
- [ ] **Stray brackets bug** — Investigate intermittent `]` and raw text display
- [ ] **Add dev console warnings** — Surface malformed data early
- [ ] **Error boundaries** — Graceful fallbacks for rendering errors

### 1.3 Polish Pass
- [ ] **Dark mode contrast** — Verify all components readable
- [ ] **Spacing consistency** — Audit padding/margins across components
- [ ] **Activity status bar** — Finish `activity-bar.tsx` component
- [ ] **Message queueing** — Send while agent is processing

### 1.4 Settings & Controls
- [ ] **Settings panel** — In sidebar or modal
- [ ] **Verbose mode toggle** — Show/hide thinking blocks
- [ ] **Reasoning display toggle** — Collapse by default?

---

### 1.5 Ralph-Loop Integration Vision

> Origin's subagent system is essentially a built-in ralph-loop. Let's make it first-class.

**Context:** Felix's ralph-loop pattern uses:
- `HANDOFF.md` — Context bridging between agent sessions
- `task-*.md` — Atomic task definitions
- Sequential/parallel execution with status tracking
- Progress visualization

**Origin could support this natively:**
- [ ] **Task queue UI** — Define multiple tasks, run them as subagents
- [ ] **Handoff documents** — Auto-generate context summaries between spawns
- [ ] **Batch spawning** — "Run these 5 tasks in parallel"
- [ ] **Dependency chains** — Task B waits for Task A
- [ ] **Progress dashboard** — Overview of all running/queued tasks

**Workflow integration:**
- [ ] **Import ROADMAP.md** — Parse tasks into spawn queue
- [ ] **Export results** — Collect subagent outputs into summary doc
- [ ] **Git integration** — Each subagent commits its work

This would make Origin a **visual ralph-loop** — same power, better UX.

---

## Phase 2: Brain X-Ray Mode

> Goal: Real-time visibility into agent internals — a "dev tools" for AI

### 2.1 Concept

Think Chrome DevTools but for agent activity. A toggleable overlay/panel showing:

- **Event stream** — Raw gateway events as they happen
- **Tool call timeline** — Visual timeline of all tool executions
- **Subagent tree** — Live hierarchy of spawned agents
- **Token flow** — Context usage over time
- **State inspector** — Current session state, pending operations

### 2.2 Implementation Ideas

**Option A: Side panel**
- Collapsible panel alongside chat
- Always visible if enabled
- Shows filtered event log

**Option B: Overlay mode**
- Toggleable full-screen overlay
- Layered on top of chat
- More detail, less persistent

**Option C: Separate window**
- Opens in new browser tab/window
- Full debugging environment
- Could connect to any session

### 2.3 Features (Prioritized)

**Must have:**
- [ ] Event log — Filterable stream of gateway events
- [ ] **Subagent tree visualization** — Live hierarchy with status, expandable
  - Shows all spawned agents across all sessions
  - Parent→child relationships
  - Click to jump to that session
  - Real-time status updates
- [ ] Tool call inspector — Click to see full input/output
- [ ] **Orchestration view** — When running ralph-loop style workflows, show the full task queue and progress

**Nice to have:**
- [ ] Token usage graph — Context over time
- [ ] Message timeline — Visual scrubber for conversation
- [ ] Performance metrics — Latency, response times
- [ ] Export/import — Save session for debugging

**Future:**
- [ ] Breakpoints — Pause before tool execution
- [ ] Replay — Step through historical sessions
- [ ] Diff view — Compare message versions

---

## Phase 3: Power Features

> Goal: Make Origin genuinely more capable than vanilla OpenClaw

### 3.1 Cross-Session Intelligence
- [ ] **Session search** — Find messages across all sessions
- [ ] **Session linking** — Reference other sessions in context
- [ ] **Shared memory** — Persistent facts across sessions

### 3.2 Projects Integration
- [ ] **Projects sidebar** — Pin projects with quick actions
- [ ] **Project context** — Auto-load relevant files when discussing project
- [ ] **Project templates** — Quick-start new projects with boilerplate

### 3.3 Chat Navigation
- [ ] **Minimap** — Visual overview of long conversations
- [ ] **Jump to** — Quick navigation (tools, errors, subagents)
- [ ] **Bookmarks** — Mark important messages

---

## Phase 4: Backend Enhancements

> Goal: Improve the agent itself, not just the UI

### 4.1 Context Management
- [ ] **Context visualization** — What's in context right now?
- [ ] **Manual context control** — Add/remove files from context
- [ ] **Smart compaction** — Better summarization strategies

### 4.2 Agent Improvements
- [ ] **Custom system prompts** — Per-session personality
- [ ] **Tool policies** — Allow/deny specific tools per session
- [ ] **Model routing** — Different models for different tasks

---

## 🔮 Planning: Agent Project Configs

> **TODO:** Design session with Felix to spec this out.

**Problem:** Every spawn requires context about the project environment:
- Package manager (npm/pnpm/yarn/bun)
- Dev vs prod mode
- Build commands
- Test commands  
- Language/framework specifics (Node/Python/Rust/Electron)
- Working directory conventions

**Vision:** A `.agentrc.json` or `agent.config.md` in each project root:

```json
{
  "packageManager": "pnpm",
  "mode": "production",
  "build": "pnpm build",
  "test": "pnpm test",
  "dev": "pnpm dev",
  "framework": "next",
  "conventions": {
    "components": "src/components",
    "cacheDir": ".next"
  }
}
```

**Benefits:**
- Agents auto-read config, no context bloat
- Consistent behavior across spawns
- Project-specific workflows without repetition
- Could inherit from parent configs (monorepo support)

**Questions to resolve:**
- File format? (JSON vs YAML vs Markdown)
- Where does it live? (root vs `.openclaw/` vs `agent.config.md`)
- How do agents discover it?
- Override hierarchy? (global → project → task)
- Integration with Origin UI? (project selector reads these)

---

## Backlog / Ideas

| Idea | Notes |
|------|-------|
| Voice mode improvements | Better TTS integration, voice selection |
| Mobile PWA | Installable app experience |
| Keyboard shortcuts | Power user navigation |
| Themes | Custom color schemes |
| Plugin system | User-installable extensions |
| Collaboration | Shared sessions (far future) |

---

## Completed

| Task | Date | Phase |
|------|------|-------|
| Session model overhaul | 2026-02-02 | 1.1 |
| Auto-naming sessions | 2026-02-02 | 1.1 |
| Clear session action | 2026-02-02 | 1.1 |
| Subagent tree nesting | 2026-02-02 | 1.1 |
| Origin rebrand | 2026-02-02 | - |
| 48 AI Elements components | 2026-02-01 | 1.0 |
| Responsive sidebar | 2026-02-02 | 1.3 |

---

_Last updated: 2026-02-02_
