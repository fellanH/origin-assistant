---
summary: "Linux support + companion app status"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Linux App"
---

# Linux App

The Gateway is fully supported on Linux. **Node is the recommended runtime**.
Bun is not recommended for the Gateway (WhatsApp/Telegram bugs).

Native Linux companion apps are planned. Contributions are welcome if you want to help build one.

## Beginner quick path (VPS)

1. Install Node 22+
2. Clone your fork and build: `git clone <fork-url> && cd origin && pnpm install && pnpm build`
3. Run onboarding: `node dist/entry-bootstrap.js onboard --install-daemon`
4. From your laptop: `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Open `http://127.0.0.1:18789/` and paste your token

Step-by-step VPS guide: [exe.dev](/platforms/exe-dev)

## Install

- [Getting Started](/start/getting-started)
- [Install & updates](/install/updating)
- Optional flows: [Bun (experimental)](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

## Gateway

- [Gateway runbook](/gateway)
- [Configuration](/gateway/configuration)

## Gateway service install (CLI)

Use one of these:

```
origin onboard --install-daemon
```

Or:

```
origin gateway install
```

### From source (local fork)

If running a local fork instead of the global npm package:

```bash
cd /path/to/your/origin
pnpm install && pnpm build
node dist/entry-bootstrap.js gateway install
```

This installs the systemd service pointing to your local build instead of the global npm package.

Or:

```
origin configure
```

Select **Gateway service** when prompted.

Repair/migrate:

```
origin doctor
```

## System control (systemd user unit)

Origin installs a systemd **user** service by default. Use a **system**
service for shared or always-on servers. The full unit example and guidance
live in the [Gateway runbook](/gateway).

Minimal setup:

Create `~/.config/systemd/user/origin-gateway[-<profile>].service`:

```
[Unit]
Description=Origin Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/path/to/origin/dist/entry-bootstrap.js gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Enable it:

```
systemctl --user enable --now origin-gateway[-<profile>].service
```
