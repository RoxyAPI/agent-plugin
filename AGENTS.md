# RoxyAPI Claude Code and Cursor plugin - Agent Guide

This repo is a Claude Code plugin, a self hosted Claude Code marketplace, and an Agent Plugins package (loaded by Cursor and other compatible clients) for RoxyAPI, the multi domain spiritual intelligence API. Installing it gives the editor a skill plus the keyless Docs MCP for RoxyAPI.

## Install

Claude Code:

```
/plugin marketplace add RoxyAPI/claude-plugin
/plugin install roxyapi@roxyapi
```

Cursor:

```
git clone https://github.com/RoxyAPI/claude-plugin ~/.cursor/plugins/local/roxyapi
```

## What ships

- `skills/roxyapi/SKILL.md`: model invoked skill. Teaches the agent when and how to call RoxyAPI (location first rule, `X-API-Key` auth, per domain endpoints, error contract, SDK and Remote MCP paths). Body is the live agent playbook from `https://roxyapi.com/AGENTS.md`.
- `.mcp.json`: auto connects the keyless Docs MCP at `https://roxyapi.com/mcp/docs` (one tool, `search_docs`). No key needed.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`: Claude Code plugin and marketplace manifests.
- `plugin.json` and `mcp.json`: the open Agent Plugins manifest and MCP config (agent-plugins.org schema 1.1.0) at the repo root.
- `.cursor-plugin/plugin.json`: Cursor manifest carrying the logo at `assets/logo.png`.

## Generated, not hand written

Every artifact is regenerated from the live OpenAPI spec and `/AGENTS.md` by `scripts/sync.ts`. The spec at `https://roxyapi.com` is the single source of truth. Do not hand edit `skills/`, `plugin.json`, `mcp.json`, `.mcp.json`, `.claude-plugin/`, or `.cursor-plugin/`. To change the plugin, change the API.

## Live API calls

The Docs MCP is keyless. For live calls add a per domain server with your key:

```json
{ "mcpServers": { "roxy-astrology": { "type": "http", "url": "https://roxyapi.com/mcp/astrology", "headers": { "X-API-Key": "YOUR_KEY" } } } }
```

Get a key at https://roxyapi.com/account. See https://roxyapi.com/docs/mcp.

## Links

- MCP guide: https://roxyapi.com/docs/mcp
- API reference: https://roxyapi.com/api-reference
- SDKs: https://roxyapi.com/docs/sdk
- Pricing: https://roxyapi.com/pricing
