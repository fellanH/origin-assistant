# Development Guide

This guide explains how to customize Origin for your personal use.

## Quick Reference

```bash
# Development
pnpm dev                    # Run CLI in dev mode
pnpm build                  # Build the project
pnpm test                   # Run tests
pnpm lint                   # Check code style

# Gateway
pnpm gateway:dev            # Run gateway (skip channels for speed)
pnpm gateway:watch          # Run with file watching

# Your fork
origin --help              # Run your built fork (after quickstart)
```

---

## Customization Points

### 1. Branding & Personality

**CLI Banner & Taglines:**
- `src/cli/banner.ts` - The startup banner shown when running commands
- `src/cli/tagline.ts` - Random taglines displayed in the banner

**Agent Identity:**
- `docs/reference/templates/IDENTITY.md` - Default agent personality
- `docs/reference/templates/SOUL.md` - Agent behavior guidelines
- Config: `~/.openclaw/openclaw.json` → `agents.<id>.identity`

### 2. Channels (Messaging Platforms)

**Enable/disable channels in** `src/cli/deps.ts`:
```typescript
export const CliDeps = {
  sendMessageWhatsApp,    // Remove to disable WhatsApp
  sendMessageTelegram,    // Remove to disable Telegram
  sendMessageDiscord,     // Remove to disable Discord
  // ...
}
```

**Channel-specific code:**
- `src/telegram/` - Telegram bot
- `src/discord/` - Discord bot
- `src/slack/` - Slack bot
- `src/whatsapp/` + `src/web/` - WhatsApp Web
- `src/signal/` - Signal
- `src/imessage/` - iMessage (macOS only)

**Plugin channels** (in `extensions/`):
- Delete any `extensions/<channel>/` folder you don't need
- They won't be loaded if the folder doesn't exist

### 3. Agent Tools

**Built-in tools** in `src/agents/tools/`:
| Tool | File | What It Does |
|------|------|--------------|
| Browser | `browser-tool.ts` | Web automation via Playwright |
| Image | `image-tool.ts` | Image analysis & generation |
| Message | `message-tool.ts` | Send messages to channels |
| Memory | `memory-tool.ts` | Vector DB queries |
| Cron | `cron-tool.ts` | Scheduled tasks |
| Canvas | `canvas-tool.ts` | Visual rendering |

**Disable tools** via config:
```json
{
  "agent": {
    "disabledTools": ["browser", "canvas"]
  }
}
```

### 4. Models & Providers

**Default model** in `~/.openclaw/openclaw.json`:
```json
{
  "agent": {
    "model": "anthropic/claude-sonnet-4"
  }
}
```

**Supported providers:**
- Anthropic (Claude)
- OpenAI
- Google (Gemini)
- AWS Bedrock
- Local models (via node-llama-cpp)

### 5. Hooks (Event Handlers)

**Built-in hooks** in `src/hooks/bundled/`:
- `command-logger/` - Log commands
- `session-memory/` - Persist conversation memory
- `soul-evil/` - Example personality modifier

**Create custom hooks:**
1. Create `~/.openclaw/hooks/my-hook/`
2. Add `hook.json` with event triggers
3. Add handler script

---

## Adding a New Channel

1. **Create the channel module:**
   ```bash
   mkdir src/my-channel
   ```

2. **Implement required interfaces** (see `src/telegram/` as reference):
   - `bot.ts` - Main bot logic
   - `monitor.ts` - Message monitoring
   - `accounts.ts` - Auth/credentials

3. **Register in deps:**
   ```typescript
   // src/cli/deps.ts
   import { sendMessageMyChannel } from "../my-channel/send.js"
   export const CliDeps = {
     // ...
     sendMessageMyChannel,
   }
   ```

4. **Add dock metadata:**
   ```typescript
   // src/channels/dock.ts
   export const MY_CHANNEL_DOCK: ChannelDock = {
     id: "my-channel",
     name: "My Channel",
     // ...
   }
   ```

---

## Adding a New Tool

1. **Create tool file:**
   ```typescript
   // src/agents/tools/my-tool.ts
   import { defineTool } from "../tool-helpers.js"

   export const myTool = defineTool({
     name: "my_tool",
     description: "Does something useful",
     parameters: { /* zod schema */ },
     execute: async (params, context) => {
       // Implementation
       return { result: "success" }
     }
   })
   ```

2. **Register in agent:**
   ```typescript
   // src/agents/agent.ts (or tool registry)
   import { myTool } from "./tools/my-tool.js"
   ```

---

## Project Structure

```
src/
├── cli/           # Command-line interface
│   ├── program/   # Command definitions
│   └── banner.ts  # Startup banner (customize here)
├── config/        # Configuration loading
├── gateway/       # Central server
├── agents/        # AI agent runtime
│   └── tools/     # Agent capabilities
├── channels/      # Channel routing
├── telegram/      # Telegram implementation
├── discord/       # Discord implementation
├── ...            # Other channels
└── plugins/       # Plugin system

extensions/        # Optional plugins (can delete unused)
apps/              # Native apps (macOS, iOS, Android)
docs/              # Documentation
scripts/           # Build & dev scripts
```

---

## Config File Reference

Location: `~/.openclaw/openclaw.json`

```json
{
  "agent": {
    "model": "anthropic/claude-sonnet-4",
    "disabledTools": [],
    "workspace": "/path/to/workspace"
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "..."
    }
  }
}
```

---

## Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...

# Development
OPENCLAW_HOME=~/.openclaw          # Config directory
OPENCLAW_SKIP_CHANNELS=1           # Skip channel loading (faster dev)
OPENCLAW_TAGLINE_INDEX=0           # Force specific tagline

# Debug
DEBUG=openclaw:*                   # Enable debug logging
```

---

## Testing Your Changes

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/my-feature.test.ts

# Run with coverage
pnpm test:coverage

# Type check only (no emit)
pnpm build --noEmit
```

---

## Tips

1. **Fast iteration:** Use `pnpm dev` instead of rebuilding
2. **Skip channels:** Set `OPENCLAW_SKIP_CHANNELS=1` for faster gateway startup
3. **Test one channel:** Comment out others in `src/cli/deps.ts`
4. **Local config:** Use `--dev` flag for isolated dev config at `~/.openclaw-dev/`
