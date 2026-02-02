# Origin

> Personal AI assistant built on OpenClaw

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

Origin is a personal fork of [OpenClaw](https://github.com/openclaw/openclaw) — streamlined, de-branded, and optimized as a neutral template for building your own AI assistant.

## Why Origin?

- **Clean slate** — Stripped of upstream branding and opinions
- **Simpler setup** — Clearer docs for non-technical users
- **Your baseline** — Fork it and make it yours

**Want the full-featured project?** Use upstream [OpenClaw](https://github.com/openclaw/openclaw) instead.

## Quick Start

**Requirements:** Node 22+

```bash
git clone https://github.com/FellanH/origin.git
cd origin
./scripts/quickstart.sh
```

This will install dependencies, build the project, create a `origin` alias, and run the onboarding wizard.

After setup: `origin <command>`

## Manual Setup

```bash
git clone https://github.com/FellanH/origin.git
cd origin
pnpm install
pnpm build
```

### Running Commands

```bash
# Via pnpm (runs TypeScript directly)
pnpm openclaw <command>

# Via node
node dist/entry-bootstrap.js <command>

# Via alias (add to ~/.bashrc or ~/.zshrc)
alias origin='node /path/to/origin/dist/entry-bootstrap.js'
```

> **Note:** The global `openclaw` command (from `npm install -g openclaw`) runs the upstream package, not your fork.

### Install Gateway Service (optional)

```bash
node dist/entry-bootstrap.js gateway install
```

Creates a LaunchAgent (macOS) or systemd service (Linux) for your fork.

### Onboard

```bash
origin onboard
```

## Configuration

Config lives at `~/.openclaw/openclaw.json`:

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}
```

## Avoiding Conflicts

| Scenario | Solution |
|----------|----------|
| Global `openclaw` runs upstream | Use `pnpm openclaw` or `node dist/entry-bootstrap.js` |
| Gateway runs wrong version | Reinstall with `node dist/entry-bootstrap.js gateway install` |
| Want complete isolation | Set `OPENCLAW_HOME` to a different directory |

## Development

See **[DEVELOPMENT.md](DEVELOPMENT.md)** for customization, adding channels/tools, and project structure.

```bash
./scripts/dev-helper.sh          # Show commands
./scripts/dev-helper.sh gateway  # Start gateway
./scripts/dev-helper.sh test     # Run tests
```

## Documentation

Full docs at upstream: [docs.openclaw.ai](https://docs.openclaw.ai)

- [Getting Started](https://docs.openclaw.ai/start/getting-started)
- [Configuration](https://docs.openclaw.ai/gateway/configuration)
- [Channels](https://docs.openclaw.ai/channels)
- [Security](https://docs.openclaw.ai/gateway/security)

## Upstream

Fork of [OpenClaw](https://github.com/openclaw/openclaw) by Peter Steinberger and the community.

## License

MIT
