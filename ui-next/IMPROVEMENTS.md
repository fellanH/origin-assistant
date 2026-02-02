# ui-next Chat Implementation

> **Reference Architecture**: [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6) and [AI Elements](https://github.com/vercel/ai-elements) component library

---

## Implementation Status

### Completed ✅

| Feature | Location | Description |
|---------|----------|-------------|
| **Message Parts Parsing** | `use-gateway.ts` | `parseHistoryMessage()` extracts `tool_use`, `tool_result`, `thinking` |
| **Dual-Stream Subscription** | `use-gateway.ts` | Subscribes to both `chat` (text) and `agent` (tools) events |
| **Persistence-Aware Cleanup** | `use-gateway.ts` | Cleans `toolExecutions` when parts are persisted (no setTimeout) |
| **Verbose Mode** | `use-gateway.ts` | `setVerboseLevel("on")` called on session load |
| **Component Wiring** | `page.tsx`, `message-parts.tsx` | Renders `message.parts` + pending `toolExecutions` |
| **48 AI Elements Components** | `src/components/ai-elements/` | All components implemented |
| **Subagent Tracking** | `use-gateway.ts`, `subagent-card.tsx` | Tracks `sessions_spawn` with live status |
| **Session Tree View** | `session-utils.ts`, `session-tree-item.tsx`, `session-sidebar.tsx` | Hierarchical sidebar with subagents nested under parents |
| **Context Token Display** | `use-gateway.ts`, `page.tsx` | Token usage + cost in header with hover breakdown |
| **Input Bug Fixes** | `page.tsx`, `input-group.tsx` | Fixed stop button behavior + text overflow |

### Remaining Work

| Feature | Priority | Description |
|---------|----------|-------------|
| **Responsive behavior** | 🟡 MEDIUM | Mobile-friendly sidebar collapse + overlay |
| **Settings Controls** | 🟢 LOW | Verbose mode toggle, reasoning display toggle |

### 📋 Completed Phases

| Phase | Status | Description | Doc |
|-------|--------|-------------|-----|
| Phase 1 | ✅ Done | Message model + parts parsing | `PHASE-1-MESSAGE-MODEL.md` |
| Phase 2 | ✅ Done | Tool events + dual-stream | `PHASE-2-TOOL-EVENTS.md` |
| Phase 3 | ✅ Done | Session tree sidebar | `PHASE-3-SESSION-TREE.md` |
| Phase 4 | ✅ Done | Layout redesign (sidebar-centric) | `PHASE-4-LAYOUT-REDESIGN.md` |

### 🔧 Housekeeping

| Task | Description |
|------|-------------|
| **Rebrand to Cortana** | Thorough rename from "OpenClaw fork" → "Cortana" (package.json, UI, docs, directory) |

### 💡 Feature Ideas

| Idea | Description |
|------|-------------|
| **Brain X-Ray mode** | Real-time visual trace of data flowing through the app — toggleable "behind the scenes" view showing gateway events, tool calls, token flow, processing states. Could be panel overlay, separate window, or external dev tool. |

### 🔮 Future Analysis

| Topic | Description |
|-------|-------------|
| **Git management strategy** | Branching, commits, upstream sync, PR workflow for the fork |
| **Context & data flow analysis** | Deep dive on state management, gateway data flow, caching |
| **Task estimation strategy** | Differentiate between human vs agent estimates |
| **Context management & transparency** | How to surface context usage to users, compaction strategies, context-aware UI hints |

---

## Architecture

### Dual-Stream Merging

The gateway uses two independent event streams. The UI handles both for real-time tool display.

```
"chat" events     │ TEXT ONLY (delta → final | aborted | error)
"agent" events    │ STRUCTURED (tool phases: start → update → result)
loadHistory RPC   │ Returns FULL structured content arrays
```

### Tool Lifecycle

```
HIDDEN → PENDING (toolExecutions) → COMPLETED → PERSISTED (message.parts)
```

**Invariant**: Tool rendered from exactly ONE source (live OR persisted).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/use-gateway.ts` | Gateway connection, dual-stream, `toolExecutions`, `useSessionStats` |
| `src/lib/session-utils.ts` | Session key parsing, tree building |
| `src/lib/storage.ts` | Local persistence with `parts` support |
| `src/app/page.tsx` | Main chat UI (sidebar-centric layout) |
| `src/components/session-sidebar.tsx` | Hierarchical session tree with header/footer slots |
| `src/components/sidebar-header.tsx` | Logo, status, token usage, settings |
| `src/components/sidebar-input.tsx` | Chat input in sidebar |
| `src/components/session-tree-item.tsx` | Recursive tree item component |
| `src/components/ai-elements/message-parts.tsx` | Renders parts + pending tools |
| `src/components/ai-elements/subagent-card.tsx` | Live subagent status display |

---

## AI Elements Component Status

> All 48 documented components implemented. Key integrations:

### Active (10)

| Component | Location |
|-----------|----------|
| Conversation | `page.tsx` |
| Message | `page.tsx` |
| Prompt Input | `page.tsx` |
| Context | `page.tsx` (header) |
| Reasoning | `message-parts.tsx` |
| Tool | `message-parts.tsx` |
| Agent | `subagent-card.tsx` |
| Loader | `page.tsx` |

### Custom Components

| Component | Purpose |
|-----------|---------|
| `message-parts.tsx` | Renders structured content (text, tools, reasoning, subagents) |
| `subagent-card.tsx` | Live subagent status with stop/history actions |
| `session-tree-item.tsx` | Recursive session tree with expand/collapse |

### Ready (38)

All other AI Elements components are implemented and ready for future use (attachments, code-block, terminal, voice components, workflow canvas, etc.)

---

## Local Documentation

```
docs/ai-elements/
├── README.md           # Full index
├── chatbot/*.md        # 18 components
├── code/*.md           # 14 components
├── voice/*.md          # 6 components
├── workflow/*.md       # 7 components
└── utility/*.md        # 3 components
```

Update: `npx tsx docs/ai-elements/scraper.ts`
