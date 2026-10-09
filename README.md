<p align="center">
  <a href="https://roxyapi.com">
    <img src="https://raw.githubusercontent.com/RoxyAPI/claude-plugin/main/assets/hero.png" alt="RoxyAPI Claude Code plugin, one install, every domain. The Spiritual OS layer for agentic AI. One key, flat pricing." width="100%">
  </a>
</p>

# RoxyAPI for Claude Code and Cursor

[![CI](https://github.com/RoxyAPI/claude-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/RoxyAPI/claude-plugin/actions/workflows/ci.yml)
[![MCP docs](https://img.shields.io/badge/MCP-roxyapi.com-blue)](https://roxyapi.com/docs/mcp)
[![API Reference](https://img.shields.io/badge/api%20reference-roxyapi.com-blue)](https://roxyapi.com/api-reference)
[![Docs](https://img.shields.io/badge/docs-roxyapi.com-blue)](https://roxyapi.com/docs)
[![Pricing](https://img.shields.io/badge/pricing-roxyapi.com-blue)](https://roxyapi.com/pricing)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

A Claude Code and Cursor plugin that teaches your coding agent how to build on RoxyAPI, the multi domain spiritual intelligence API: Western and Vedic astrology, horoscopes, forecast, human design, Chinese astrology, feng shui, Mesoamerican astrology, Vastu, numerology, Kabbalah, tarot, biorhythm, Ayurveda, I Ching, crystals, dreams, angel numbers, and location. One key, every domain. Remote MCP, typed SDKs, and drop in UI components live alongside at [roxyapi.com](https://roxyapi.com).

One install gives the agent two things, no API key required:

- A **Skill** that tells the agent when and how to call RoxyAPI: the location first rule, `X-API-Key` auth, endpoints per domain, the error contract, and the SDK and Remote MCP integration paths.
- The keyless **Docs MCP** (`search_docs`), auto connected, so the agent looks up the exact endpoint, field, or SDK method live from the reference instead of guessing.

Both stay current automatically. The plugin is regenerated from the live OpenAPI spec and the published agent playbook, so as the API grows the Skill grows with it.

## Install in Claude Code

```
/plugin marketplace add RoxyAPI/claude-plugin
/plugin install roxyapi@roxyapi
```

## Install in Cursor

Clone the plugin into the local plugins folder, then reload Cursor:

```
git clone https://github.com/RoxyAPI/claude-plugin ~/.cursor/plugins/local/roxyapi
```

Cursor reads `.cursor-plugin/plugin.json`, loads the same Skill, and connects the same keyless Docs MCP.

That is the whole setup. The agent now reaches for RoxyAPI when you build any astrology, tarot, numerology, human design, forecast, or other insight feature, and can query the Docs MCP for exact endpoints while it writes the integration.

## Make live API calls

The Docs MCP is keyless and answers questions about the API. To let Claude call the API for real (returning live charts, readings, or forecasts), add a per domain Remote MCP server with your key. Get a key at [roxyapi.com/account](https://roxyapi.com/account), then add to your MCP config:

```json
{
  "mcpServers": {
    "roxy-astrology": {
      "type": "http",
      "url": "https://roxyapi.com/mcp/astrology",
      "headers": { "X-API-Key": "YOUR_KEY" }
    }
  }
}
```

Swap `astrology` for any domain. See the [MCP guide](https://roxyapi.com/docs/mcp).

## Remote MCP servers

Every domain is its own Streamable HTTP server at `https://roxyapi.com/mcp/{domain}`. They are hosted, so there is nothing to install, build, or run locally: point an MCP client at the URL and the tools are discovered on connect. Each one is listed and live tested on Glama:

[astrology](https://glama.ai/mcp/connectors/com.roxyapi/astrology) · [vedic-astrology](https://glama.ai/mcp/connectors/com.roxyapi/vedic-astrology) · [forecast](https://glama.ai/mcp/connectors/com.roxyapi/forecast) · [human-design](https://glama.ai/mcp/connectors/com.roxyapi/human-design) · [chinese-astrology](https://glama.ai/mcp/connectors/com.roxyapi/chinese-astrology) · [feng-shui](https://glama.ai/mcp/connectors/com.roxyapi/feng-shui) · [mesoamerican-astrology](https://glama.ai/mcp/connectors/com.roxyapi/mesoamerican-astrology) · [vastu](https://glama.ai/mcp/connectors/com.roxyapi/vastu) · [numerology](https://glama.ai/mcp/connectors/com.roxyapi/numerology) · [kabbalah](https://glama.ai/mcp/connectors/com.roxyapi/kabbalah) · [tarot](https://glama.ai/mcp/connectors/com.roxyapi/tarot) · [biorhythm](https://glama.ai/mcp/connectors/com.roxyapi/biorhythm) · [ayurveda](https://glama.ai/mcp/connectors/com.roxyapi/ayurveda) · [iching](https://glama.ai/mcp/connectors/com.roxyapi/iching) · [crystals](https://glama.ai/mcp/connectors/com.roxyapi/crystals) · [dreams](https://glama.ai/mcp/connectors/com.roxyapi/dreams) · [angel-numbers](https://glama.ai/mcp/connectors/com.roxyapi/angel-numbers) · [location](https://glama.ai/mcp/connectors/com.roxyapi/location) · [docs](https://glama.ai/mcp/connectors/com.roxyapi/docs)

This repository is the Claude Code and Cursor plugin, not one of those servers. It carries no MCP server of its own to install: it connects the editor to the hosted ones above and ships the Skill that teaches the agent how to use them.

## What is RoxyAPI

Hosted infrastructure for insight, prediction, and spiritual intelligence apps. One subscription, one API key, every domain. Calculations are powered by Roxy Ephemeris, verified against NASA JPL Horizons. Flat pricing, no AGPL, instant key delivery, typed SDKs for TypeScript, Python, PHP, C#, and Go, and Remote MCP across every domain. See the [methodology](https://roxyapi.com/methodology).

## Links

- MCP guide: [roxyapi.com/docs/mcp](https://roxyapi.com/docs/mcp)
- API reference: [roxyapi.com/api-reference](https://roxyapi.com/api-reference)
- SDKs: [roxyapi.com/docs/sdk](https://roxyapi.com/docs/sdk)
- Templates and starters: [roxyapi.com/templates](https://roxyapi.com/templates)
- Pricing: [roxyapi.com/pricing](https://roxyapi.com/pricing)

## License

MIT. See [LICENSE](./LICENSE).
