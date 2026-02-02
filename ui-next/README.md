# Origin UI

Modern chat interface for Origin, built with Next.js 16.

## Overview

This is the primary UI for interacting with Origin. It connects to the OpenClaw Gateway via WebSocket for real-time chat, tool execution display, and session management.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- **Sidebar-centric layout** — Chat input and session tree in sidebar
- **Real-time tool display** — See tool calls as they execute
- **Session management** — Hierarchical session tree with subagent tracking
- **Token usage display** — Context window and cost tracking
- **48 AI Elements components** — Full Vercel AI Elements library

## Architecture

Built on:
- **Next.js 16** with React 19
- **Vercel AI Elements** component library
- **OpenClaw Gateway** WebSocket protocol
- **Tailwind CSS 4** for styling

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main chat UI |
| `src/lib/gateway.ts` | Gateway client |
| `src/lib/use-gateway.ts` | React hooks for gateway |
| `src/components/` | UI components |

See `IMPROVEMENTS.md` for detailed implementation status.
