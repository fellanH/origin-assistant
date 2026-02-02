---
summary: "Beginner guide: from zero to first message (wizard, auth, channels, pairing)"
read_when:
  - First time setup from zero
  - You want the fastest path from install to onboarding to first message
title: "Getting Started"
---

# Getting Started

Goal: go from **zero** to **first working chat** (with sane defaults) as quickly as possible.

Fastest chat: open the Control UI (no channel setup needed). Run `origin dashboard`
and chat in the browser, or open `http://127.0.0.1:18789/` on the gateway host.
Docs: [Dashboard](/web/dashboard) and [Control UI](/web/control-ui).

Recommended path: use the **CLI onboarding wizard** (`origin onboard`). It sets up:

- model/auth (OAuth recommended)
- gateway settings
- channels (WhatsApp/Telegram/Discord/Mattermost (plugin)/...)
- pairing defaults (secure DMs)
- workspace bootstrap + skills
- optional background service

If you want the deeper reference pages, jump to: [Wizard](/start/wizard), [Setup](/start/setup), [Pairing](/start/pairing), [Security](/gateway/security).

Sandboxing note: `agents.defaults.sandbox.mode: "non-main"` uses `session.mainKey` (default `"main"`),
so group/channel sessions are sandboxed. If you want the main agent to always
run on host, set an explicit per-agent override:

```json
{
  "routing": {
    "agents": {
      "main": {
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    }
  }
}
```

## 0) Prereqs

- Node `>=22`
- `pnpm` (optional; recommended if you build from source)
- **Recommended:** Brave Search API key for web search. Easiest path:
  `origin configure --section web` (stores `tools.web.search.apiKey`).
  See [Web tools](/tools/web).

macOS: if you plan to build the apps, install Xcode / CLT. For the CLI + gateway only, Node is enough.
Windows: use **WSL2** (Ubuntu recommended). WSL2 is strongly recommended; native Windows is untested, more problematic, and has poorer tool compatibility. Install WSL2 first, then run the Linux steps inside WSL. See [Windows (WSL2)](/platforms/windows).

## 1) Install from source (this fork)

```bash
git clone <your-fork-url>
cd origin
./scripts/quickstart.sh
```

The quickstart script will:
- Install dependencies (pnpm)
- Build the project
- Create a `origin` shell alias
- Run the onboarding wizard

After setup, use `origin <command>` to run your fork.

### Manual setup

If you prefer to set things up manually:

```bash
git clone <your-fork-url>
cd origin

pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build

# Run commands from your local build
node dist/entry-bootstrap.js onboard --install-daemon

# Or use pnpm (runs TypeScript directly)
pnpm openclaw onboard --install-daemon
```

**Important:** The global `openclaw` command (from `npm install -g openclaw`) runs the upstream npm package, **not your fork**. To run your local fork, use `node dist/entry-bootstrap.js <command>` or `pnpm openclaw <command>` from within the repo directory.

**Node version:** Node 22 is recommended. Node 25+ may show deprecation warnings.

## 2) Run the onboarding wizard (and install the service)

```bash
origin onboard --install-daemon
```

What you'll choose:

- **Local vs Remote** gateway
- **Auth**: OpenAI Code (Codex) subscription (OAuth) or API keys. For Anthropic we recommend an API key; `claude setup-token` is also supported.
- **Providers**: WhatsApp QR login, Telegram/Discord bot tokens, Mattermost plugin tokens, etc.
- **Daemon**: background install (launchd/systemd; WSL2 uses systemd)
  - **Runtime**: Node (recommended; required for WhatsApp/Telegram). Bun is **not recommended**.
- **Gateway token**: the wizard generates one by default (even on loopback) and stores it in `gateway.auth.token`.

Wizard doc: [Wizard](/start/wizard)

### Auth: where it lives (important)

- **Recommended Anthropic path:** set an API key (wizard can store it for service use). `claude setup-token` is also supported if you want to reuse Claude Code credentials.

- OAuth credentials (legacy import): `~/.openclaw/credentials/oauth.json`
- Auth profiles (OAuth + API keys): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

Headless/server tip: do OAuth on a normal machine first, then copy `oauth.json` to the gateway host.

## 3) Start the Gateway

If you installed the service during onboarding, the Gateway should already be running:

```bash
origin gateway status
```

Manual run (foreground):

```bash
origin gateway --port 18789 --verbose
```

Dashboard (local loopback): `http://127.0.0.1:18789/`
If a token is configured, paste it into the Control UI settings (stored as `connect.params.auth.token`).

**Bun warning (WhatsApp + Telegram):** Bun has known issues with these
channels. If you use WhatsApp or Telegram, run the Gateway with **Node**.

## 3.5) Quick verify (2 min)

```bash
origin status
origin health
origin security audit --deep
```

## 4) Pair + connect your first chat surface

### WhatsApp (QR login)

```bash
origin channels login
```

Scan via WhatsApp Settings Linked Devices.

WhatsApp doc: [WhatsApp](/channels/whatsapp)

### Telegram / Discord / others

The wizard can write tokens/config for you. If you prefer manual config, start with:

- Telegram: [Telegram](/channels/telegram)
- Discord: [Discord](/channels/discord)
- Mattermost (plugin): [Mattermost](/channels/mattermost)

**Telegram DM tip:** your first DM returns a pairing code. Approve it (see next step) or the bot won't respond.

## 5) DM safety (pairing approvals)

Default posture: unknown DMs get a short code and messages are not processed until approved.
If your first DM gets no reply, approve the pairing:

```bash
origin pairing list whatsapp
origin pairing approve whatsapp <code>
```

Pairing doc: [Pairing](/start/pairing)

## From source (development)

If you're hacking on Origin itself, run from source:

```bash
git clone <your-fork-url>
cd origin
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
origin onboard --install-daemon
```

If you don't have the `origin` alias yet, run the onboarding step via `pnpm openclaw ...` from the repo.
`pnpm build` also bundles A2UI assets; if you need to run just that step, use `pnpm canvas:a2ui:bundle`.

Gateway (from this repo):

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 7) Verify end-to-end

In a new terminal, send a test message:

```bash
origin message send --target +15555550123 --message "Hello from Origin"
```

If `origin health` shows "no auth configured", go back to the wizard and set OAuth/key auth — the agent won't be able to respond without it.

Tip: `origin status --all` is the best pasteable, read-only debug report.
Health probes: `origin health` (or `origin status --deep`) asks the running gateway for a health snapshot.

## Next steps (optional, but great)

- macOS menu bar app + voice wake: [macOS app](/platforms/macos)
- iOS/Android nodes (Canvas/camera/voice): [Nodes](/nodes)
- Remote access (SSH tunnel / Tailscale Serve): [Remote access](/gateway/remote) and [Tailscale](/gateway/tailscale)
- Always-on / VPN setups: [Remote access](/gateway/remote), [exe.dev](/platforms/exe-dev), [Hetzner](/platforms/hetzner), [macOS remote](/platforms/mac/remote)
