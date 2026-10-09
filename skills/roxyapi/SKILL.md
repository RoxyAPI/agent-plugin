---
name: roxyapi
description: Use RoxyAPI to build or integrate any astrology, divination, or insight feature. RoxyAPI is a multi domain API with Remote MCP under one key. Invoke when the user is building or asking about natal charts, horoscopes, Vedic kundli, panchang, synastry or compatibility, tarot readings, numerology reports, human design charts, transits or forecasts, BaZi four pillars or Chinese zodiac, feng shui flying stars or Kua numbers, Mayan day signs or the Aztec calendar, Vastu, gematria or the 72 names, Ayurvedic constitution, biorhythm, I Ching, crystals, dream meanings, angel numbers, or city and timezone lookup, or any prediction, divination, or self knowledge app, agent, chatbot, or MCP integration. Covers endpoints, X-API-Key auth, the location first rule, typed SDKs, and Remote MCP.
---

# RoxyAPI - Agent Implementation Playbook

> Tight playbook for AI coding agents building an end-user app on RoxyAPI, live at `https://roxyapi.com/AGENTS.md`. For product scope and evidence use `https://roxyapi.com/llms.txt`. For the exact contract of any call, query the OpenAPI spec with the jq recipe below.

RoxyAPI ships 261+ endpoints across 18 genuinely distinct data domains under one API key. Planetary positions are verified against NASA JPL Horizons; derived calculations are checked against the reference named for each domain. Remote MCP at `https://roxyapi.com/mcp/{domain}`. Commercial API use is covered by https://roxyapi.com/policy/license; open-source components carry their own licenses.

> **Production base URL: `https://roxyapi.com/api/v2`.**

## Set up this agent (no API key)

Run the line for the client you are running in yourself; do not ask the user to. Each registers the keyless Docs MCP `roxy-docs` (Streamable HTTP, one tool `search_docs`, no API key), which answers any endpoint, field, SDK method, auth detail or integration step from this reference, so you never guess a path.

| Client | Run |
|---|---|
| Claude Code | `claude plugin marketplace add RoxyAPI/agent-plugin` then `claude plugin install roxyapi@roxyapi`: the Docs MCP plus a skill for every RoxyAPI domain. Server only: `claude mcp add --transport http --scope user roxy-docs https://roxyapi.com/mcp/docs`. Check with `claude mcp list`. |
| Codex | `codex mcp add roxy-docs --url https://roxyapi.com/mcp/docs`. Check with `codex mcp list`. |
| Cursor | `git clone https://github.com/RoxyAPI/agent-plugin ~/.cursor/plugins/local/roxyapi` then `Developer: Reload Window`: the same plugin as Claude Code. Server only, no add command: put `"roxy-docs": { "url": "https://roxyapi.com/mcp/docs" }` under `mcpServers` in `~/.cursor/mcp.json`, or `.cursor/mcp.json` for this project only. |
| VS Code, GitHub Copilot | `code --add-mcp '{"name":"roxy-docs","type":"http","url":"https://roxyapi.com/mcp/docs"}'` |
| Windsurf (Devin Desktop) | `devin mcp add -s user roxy-docs https://roxyapi.com/mcp/docs`. For Cascade, put `"roxy-docs": { "serverUrl": "https://roxyapi.com/mcp/docs" }` under `mcpServers` in `~/.codeium/windsurf/mcp_config.json`. |
| Gemini CLI | `gemini mcp add --transport http --scope user roxy-docs https://roxyapi.com/mcp/docs`. Check with `gemini mcp list`. |
| Any other MCP client | `{ "mcpServers": { "roxy-docs": { "type": "http", "url": "https://roxyapi.com/mcp/docs" } } }` in its MCP config. |

A newly added server loads on the next session, so tell the user: **RoxyAPI setup done. Restart your agent to load the Docs MCP.** Until then, read this file and query the spec below.

The API key lives in the `ROXY_API_KEY` environment variable. Read it from there in code and never ask for it in chat. Not set? Ask the user to get a key at `https://roxyapi.com/checkout` and export it. Every client, including the per-domain servers for live calls: `https://roxyapi.com/docs/mcp`.

For live API calls add a per-domain server (`https://roxyapi.com/mcp/{domain}`) with your `X-API-Key`. Pass `compact: true` on any tool call for a lossless, token-optimized response that cuts the LLM tokens per call by roughly 40 to 52 percent (same data, each field name sent once), lowering your agent inference cost at no change to quota.

## Inspect the OpenAPI spec

`https://roxyapi.com/api/v2/openapi.json` is the contract: every domain and every operation in one OpenAPI 3.1 document, generated from the live endpoints. It runs to several megabytes, far too large to read into context and available as machine-readable JSON. Its paths are the exact paths you call under `https://roxyapi.com/api/v2`, and each `operationId` is the SDK method name. No shell, only a web-fetch tool? Do not fetch the spec: a summarizing fetch of a document this size drops and conflates fields. Ask `search_docs` on the Docs MCP, which returns every field of an operation; without MCP either, read the domain page `https://roxyapi.com/products/{slug}.md`, which shows a real response. Then confirm with one real call.

```bash
# The whole contract, every domain in one file. Query it with jq; never read it into context.
curl -s https://roxyapi.com/api/v2/openapi.json -o roxyapi.json
# Domains: the first path segment of every operation
jq -r '[.paths | keys[] | split("/")[1]] | unique | join(" ")' roxyapi.json
# Operations in one domain: operationId, method, path, summary
jq -r --arg d astrology '.paths | to_entries[] | select(.key | split("/")[1] == $d) | .key as $p | .value | to_entries[] | "\(.value.operationId)  \(.key | ascii_upcase) \($p)  \(.value.summary)"' roxyapi.json
# The operation for a task: searches paths, operationIds and summaries
jq -r --arg q 'life path' '.paths | to_entries[] | .key as $p | .value | to_entries[] | select("\($p) \(.value.operationId) \(.value.summary)" | test($q; "i")) | "\(.value.operationId)  \(.key | ascii_upcase) \($p)  \(.value.summary)"' roxyapi.json
# One operation: params, body fields (required marked), an example body built from the spec, response fields, key types
jq --arg op generateNatalChart '.components.schemas as $s | def d: if type == "object" and has("$ref") then $s[.["$ref"] | split("/") | last] else . end; def t: d | (.type // ([.anyOf[]? | .type] | join("|"))) + (if .enum then " " + (.enum | map(tostring) | join("|")) else "" end); def shape: d | if .type == "array" then "[{\(.items | d | .properties // {} | keys | join(","))}]" elif .properties then "{\(.properties | keys | join(","))}" else t end; .paths | to_entries[] | .key as $p | .value | to_entries[] | select(.value.operationId == $op) | .value as $o | ($o.requestBody.content["application/json"].schema | d) as $b | {call: "\(.key | ascii_upcase) \($p)", keyTypes: $o["x-key-types"], params: [$o.parameters[]? | "\(.in) \(.name)\(if .required then " (required)" else "" end): \(.schema | t)"], body: [($b.required // []) as $r | $b.properties // {} | to_entries[] | .key as $k | "\($k)\(if ($r | index($k)) then " (required)" else "" end): \(.value | t)"], example: ($b.properties // {} | map_values(d | .example)), response: ($o.responses["200"].content["application/json"].schema | d | .properties // {} | map_values(shape))}' roxyapi.json
# One nested field of that operation (body or response), one level down, with descriptions
jq -r --arg op generateNatalChart --arg f planets '.components.schemas as $s | def d: if type == "object" and has("$ref") then $s[.["$ref"] | split("/") | last] else . end; .paths[][] | select(.operationId? == $op) | [.requestBody.content["application/json"].schema, .responses["200"].content["application/json"].schema] | map(d | .properties[$f] // empty) | first | d | (.items // .) | d | .properties // {} | to_entries[] | "\(.key): \(.value | d | .type // "object")  \(.value | d | .description // "" | .[0:120])"' roxyapi.json
# Every error code, the value to switch on
jq -r '.info["x-error-codes"][] | "\(.status) \(.code): \(.meaning)"' roxyapi.json
```

Audit before you write the call:

- Use a field only after the operation line prints it. A name you cannot find does not exist: search again, never guess, never assume a sibling domain names it the same way.
- Send enum values exactly as listed, case included.
- Build the first request from example: every value in it is one the operation accepts.
- keyTypes is the x-key-types extension. ["secret"] means a server-side sk_ key only; absent means either key class.
- Switch on the error code, never on the message text.
- Importing into a tool platform or a code generator? Use that one domain's spec, for example /api/v2/astrology/openapi.json, whose paths are relative to /api/v2/astrology. For reading, always the combined one.

## Rule 0: Location first, charts second

Every chart, horoscope, panchang, dasha, dosha, navamsa, KP, synastry, compatibility, and natal endpoint requires `latitude`, `longitude`, and `timezone`. Call Location first. Never ask the user for coordinates.

```
1. GET https://roxyapi.com/api/v2/location/search?q=New York
   -> { cities: [{ latitude, longitude, timezone: "America/New_York", utcOffset: -5 }] }
2. POST https://roxyapi.com/api/v2/astrology/natal-chart
   body: { date, time, latitude, longitude, timezone: "America/New_York" }
```

`q` accepts bare city (`Tokyo`), city + country (`Berlin Germany`), or comma-qualified (`Springfield, Illinois`). Use the qualified form to disambiguate same-named cities. Case-insensitive, partial matching.

`timezone` accepts decimal (`-5`, `5.5`) OR IANA string (`"America/New_York"`). IANA is preferred; it resolves to the DST-correct offset for the request's `date`.

**Already geocoding?** If the app already resolves places with its own geocoder, keep it and send its values: latitude and longitude in decimal degrees, and timezone as the IANA name of that place (America/New_York, Europe/London, Asia/Kolkata) rather than a fixed offset, so daylight saving resolves for the birth date. Location stays the default because one call returns all three for 235,000+ places, ranked across alternate and historic spellings.

## Authentication

- Header: `X-API-Key: <key>` on every request. No OAuth, no Bearer dance.
- Get a key: `https://roxyapi.com/checkout`. Instant delivery, no approval queue.
- Two key types: secret `sk_` for server-side (full access, store in env `ROXY_API_KEY`, never ship to a browser) and publishable `pk_` for browsers, widgets, and no-code embeds (safe in client code when locked to your domains with an origin allowlist). Mint either at `https://roxyapi.com/account`.

## Pick your path

Every agent guide linked below is raw markdown on GitHub: fetch it whole with `curl -s <url>`, not a summarizing web tool, which drops sections of a long file.

| User context | Do this |
|---|---|
| Want a full app to fork and white-label | Skip the wiring: clone a free, MIT-licensed template at `https://roxyapi.com/templates` (12 total, the flagships are the multi-domain AI Astrology Chatbot and the AI Spiritual Companion with memory, both wired to Remote MCP). Add your API key, rebrand, ship. Every template repo ships its own agent guide, for example `https://raw.githubusercontent.com/RoxyAPI/ai-spiritual-companion/main/AGENTS.md`. |
| TypeScript or JavaScript project | `npm install @roxyapi/sdk`. Fully typed, zero deps. Read its agent guide before the first call: `https://raw.githubusercontent.com/RoxyAPI/sdk-typescript/main/AGENTS.md` (also bundled at `node_modules/@roxyapi/sdk/AGENTS.md`). |
| Python project | `pip install roxy-sdk`. Sync and async. Agent guide: `https://raw.githubusercontent.com/RoxyAPI/sdk-python/main/AGENTS.md`. |
| PHP project (Laravel, Symfony, Slim, plain PHP) | `composer require roxyapi/sdk`. PHP 8.2+. Agent guide: `https://raw.githubusercontent.com/RoxyAPI/sdk-php/main/AGENTS.md`. |
| .NET project (ASP.NET Core, Blazor, console) | `dotnet add package RoxyApi.Sdk`. Agent guide: `https://raw.githubusercontent.com/RoxyAPI/sdk-dotnet/main/AGENTS.md`. |
| Need to render the response in a UI | `npm install @roxyapi/ui-react` (React, Next.js), `@roxyapi/ui-vue` (Vue, Nuxt), or `@roxyapi/ui` (anything else, or one CDN script tag). MIT web components that draw an API response passed as `data`, or a Remote MCP tool result through `componentForTool(toolName)`. Agent guide with every component, prop and gotcha: `https://raw.githubusercontent.com/RoxyAPI/ui/main/AGENTS.md`. |
| WordPress site | Install **RoxyAPI** from the WordPress.org Plugin Directory: `https://wordpress.org/plugins/roxyapi/` (or in admin: Plugins → Add New → search "RoxyAPI"). Gutenberg blocks and shortcodes for all 18 domains. Agent guide: `https://raw.githubusercontent.com/RoxyAPI/sdk-wordpress/main/AGENTS.md`. Integration guide: `https://roxyapi.com/docs/integrations/wordpress`. |
| No-code site (Squarespace, Wix, Shopify, any CMS HTML block) | Copy-paste a prefilled widget from `https://roxyapi.com/widgets`: a one-tag snippet or hosted embed URL per embeddable component, powered by a publishable `pk_` key locked to the site origin. No backend, no build step. Platform walkthroughs: `https://roxyapi.com/docs/integrations/squarespace`, `/docs/integrations/wix`, `/docs/integrations/shopify`. |
| Go project | `go get github.com/RoxyAPI/sdk-go`. Agent guide: `https://raw.githubusercontent.com/RoxyAPI/sdk-go/main/AGENTS.md`. |
| Ruby, Rust, anything else | Generate a typed client from the OpenAPI: `npx openapi-typescript https://roxyapi.com/api/v2/openapi.json` or your language equivalent. |
| AI agent (Claude, GPT, Gemini, Cursor, VS Code, Claude Code) | Use MCP. Per-domain Streamable HTTP servers at `https://roxyapi.com/mcp/{domain}`. No OAuth, no Docker. See `https://roxyapi.com/docs/mcp`. |
| Claude Desktop (one config) | Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\\Claude\\claude_desktop_config.json` (Windows). Add `"mcpServers": { "roxy-astrology": { "type": "http", "url": "https://roxyapi.com/mcp/astrology", "headers": { "X-API-Key": "<key>" } } }`. Restart Claude. Repeat per domain you want exposed. |
| No-code platform (n8n, Make, Zapier, Lovable, Bubble, Wix) | See `https://roxyapi.com/docs/integrations/{platform}`. MCP-first integration where the platform supports it. |

## Common tasks (one line each)

Base URL for every path: `https://roxyapi.com/api/v2`. Auth: `X-API-Key: <key>`.

> **SDK method names** are the OpenAPI `operationId` (the jq recipe above prints it): camelCase in TypeScript and PHP, snake_case in Python, PascalCase in Go, while C# is path-fluent. The call shape of each language is in its agent guide, linked in Pick your path. TypeScript examples: `roxy.astrology.getDailyHoroscope({ path: { sign: 'aries' } })`, `roxy.numerology.calculateLifePath({ body: { year, month, day } })`.

- Daily horoscope: `GET /astrology/horoscope/{sign}/daily` (sign is path, not query; lowercase). Period segment is one of `daily | weekly | monthly | yearly`. Shared core on all four: `{ sign, overview, love, career, health, finance, advice, compatibleSigns, column, events[] }` where `column` is the whole reading as one continuous piece of prose and `events[]` lists the dated astronomical events the reading is built on (each with the exact UTC instant and the house it falls in for this sign). Daily adds `{ date, luckyNumber, luckyColor, activeTransits, moonSign, moonPhase, energyRating }`. Weekly adds `{ week, luckyNumbers[], luckyDays[] }` (note plural). Monthly adds `{ month, luckyNumbers[], luckyColor, weekByWeek[], keyDates[] }`. Yearly adds `{ year, themes[], keyPeriods[], eclipses[], retrogrades[], bestPeriods, luckyNumbers[], luckyColor }` (optional `?year=1900..2100` builds an archive or a forecast ahead of time).
- Western birth chart: `POST /astrology/natal-chart` with `{ date, time, latitude, longitude, timezone }` at top level. `timezone` is required. Response is `{ planets[], houses[], aspects[] }` (flat arrays).
- Vedic kundli: `POST /vedic-astrology/birth-chart` with the same body. Lahiri ayanamsa applied server-side. Response is HOUSE-MAP keyed by SIGN NAME, not `planets[]`: `{ aries: { rashi, signs: [...] }, taurus: {...}, ..., pisces: {...}, meta, houses, combustion, planetaryWar, interpretations }`. Iterate over the 12 sign keys to get planet placements.
- Panchang: `POST /vedic-astrology/panchang/detailed` with `{ date, latitude, longitude }`. NO `time` field.
- Kundali matching: `POST /vedic-astrology/compatibility` (Guna Milan 36-point Ashtakoota). Body wraps both people: `{ person1: { date, time, latitude, longitude, timezone? }, person2: { ... } }`. Response: `{ total, maxScore: 36, percentage, isCompatible, recommendation, doshas[], breakdown: [{ category, maxScore, score, description, person1, person2 }] }`. Eight breakdown categories (Koots): Varna, Vashya, Tara, Yoni, Grahamaitri, Gana, Bhakoot, Nadi.
- Vedic dasha (current Mahadasha + Antardasha): `POST /vedic-astrology/dasha/current` with `{ date, time, latitude, longitude, timezone? }`. For the full 120-year Vimshottari timeline use `POST /vedic-astrology/dasha/major`. Sub-periods within a Mahadasha: `POST /vedic-astrology/dasha/sub/{mahadasha}` (path is lowercase planet, e.g. `venus`).
- Doshas: `POST /vedic-astrology/dosha/manglik`, `/kalsarpa`, `/sadhesati`. Same body as kundli. Response carries `{ present: boolean, severity, description, exceptions, remedies }`.
- Numerology life path: `POST /numerology/life-path` with `{ year, month, day }` integers. NOT a `birthDate` string.
- Numerology full chart: `POST /numerology/chart` with `{ fullName, year, month, day }`. `fullName` is birth-certificate name. Response numbers are NESTED: `coreNumbers.{ lifePath, expression, soulUrge, personality, birthDay, maturity }` each carrying `{ number, calculation, type, hasKarmicDebt, meaning }`. Plus top-level `{ profile, additionalInsights, birthDayProfile, maturityStatus, luckyAssociations, summary }`.
- Tarot draw: `POST /tarot/draw` with `{ count: 1..78 }`. Optional `seed`, `allowReversals`, `allowDuplicates`. Response is `{ cards: [...] }` (flat array), DIFFERENT from spreads which return `{ positions: [{ card, ... }] }`.
- Three-card spread: `POST /tarot/spreads/three-card` with optional `{ question?, seed? }`. Position labels: Past, Present, Future. Response is `{ positions: [{ card, ... }] }`, not `cards[]`. Each `card` is a `DrawnCard`: `{ id, name, arcana, suit, number, position, reversed: boolean, keywords[], meaning: string, imageUrl }`. Note `reversed` (not `isReversed`) and `meaning` is a single string (orientation already applied). Same body shape on `/tarot/spreads/celtic-cross` (10 positions: Present Situation, Challenge, Distant Past, Near Future, Above, Below, Advice, External Influences, Hopes and Fears, Final Outcome), `/tarot/spreads/love` (5 positions), `/tarot/spreads/career` (5 positions). Custom spreads at `/tarot/spreads/custom` add a required `positions` array.
- Human Design bodygraph: `POST /human-design/bodygraph` with `{ date, time, timezone }`. NO coordinates (HD uses the birth instant, not the observer location, so no Location step). One call returns `{ type, strategy, authority, profile, definition, incarnationCross, centers[9], channels[], gates[26] }`. Type-only quiz entry: `POST /human-design/type`. Two-person compatibility: `POST /human-design/connection` with `{ personA, personB }` (each `{ date, time, timezone }`).
- Forecast: `POST /forecast/transits` (Western transit-to-natal aspects, ingresses, retrograde stations) and `POST /forecast/timeline` (cross-domain merge of Western transits, Vedic dasha boundaries, and biorhythm critical days) both take `{ birthData: { date, time, timezone }, startDate?, endDate? }`. 90-day max horizon, events ranked by `significance`. Annual birthday chart: `POST /forecast/solar-return` with `{ date, time, year, latitude, longitude, timezone }` (needs coordinates, so call Location first).
- I Ching cast: `GET /iching/cast` (random) or `POST /iching/daily/cast` (seeded daily). Response is `{ hexagram, lines, changingLinePositions, resultingHexagram }` where each `hexagram` has `{ number (1-64), symbol, chinese, english, pinyin, judgment, image, interpretation, changingLines }`. Hexagram detail: `GET /iching/hexagrams/{number}` where `number` is integer 1..64.
- Biorhythm daily: `POST /biorhythm/daily` with `{ birthDate, date?, seed? }`. Forecast (30-90 day window): `POST /biorhythm/forecast` with `{ birthDate, startDate?, endDate? }`. Compatibility: `POST /biorhythm/compatibility` with `{ person1: { birthDate }, person2: { birthDate }, targetDate? }`. Flat birthDate per person, no time or coordinates.
- Crystals: `GET /crystals/zodiac/{sign}` (zodiac match), `GET /crystals/chakra/{chakra}` (chakra ignores case and punctuation: `Root`, `Sacral`, `Solar Plexus`, `Heart`, `Throat`, `Third Eye`, `Crown`, and for the two-word chakras `third-eye`, `third_eye` and `Third%20Eye` all resolve alike), `GET /crystals/birthstone/{month}` (month integer 1..12), `GET /crystals/search?q=` for free-text.
- Angel number lookup: `GET /angel-numbers/lookup?number=1111`. Works for ANY positive integer (digit-root fallback).
- Dream symbol: `GET /dreams/symbols/{slug}` (kebab-case slug, e.g. `flying`, `water`, `snake`, `falling`, `house`, `death`). Catalog is 2,000+ symbols. Browse all: `GET /dreams/symbols?limit=50&offset=0` returns `{ total, limit, offset, symbols: [{ id, name, ... }] }`.

## Error contract

200 on success returns clean JSON, no wrapper. Errors return `{ "error": string, "code": string, "doc_url": string }`, where `doc_url` is an absolute link to the documented entry for that code. Switch on `code` (stable):

`validation_error` (400), `bad_request` (400), `date_out_of_range` (400), `api_key_required` (401), `invalid_api_key` (401), `api_key_revoked` (401), `subscription_not_found` (401), `subscription_inactive` (401), `publishable_key_not_allowed_on_mcp` (401), `invalid_client_ip` (401), `unauthorized` (401), `forbidden` (403), `origin_required` (403), `origin_not_allowed` (403), `not_found` (404), `method_not_allowed` (405), `conflict` (409), `gone` (410), `payload_too_large` (413), `unsupported_media_type` (415), `unprocessable_entity` (422), `rate_limit_exceeded` (429), `rate_limit_per_minute` (429), `rate_limited` (429), `free_tier_exhausted` (429), `internal_error` (500), `compute_saturated` (503), `error` (any status). A `validation_error` returns `issues[]` with every field error at once. The fuzzy `suggestions` array appears on PATH-routing `not_found` responses, meaning a wrong URL shape, not on lookup misses where the URL is valid but the resource is missing (an unknown dream slug returns `{ error, code: "not_found", doc_url }` with no suggestions). On `rate_limit_per_minute`, honour `Retry-After`. Every code, with the fix for each, is at https://roxyapi.com/docs/errors.md.

Do not retry on 4xx. Do retry on 429 and 5xx with exponential backoff.

## Field formats (gotcha-prone)

| Field | Good | Bad |
|---|---|---|
| `timezone` | `-5` or `"America/New_York"` | `"5:30"`, `"GMT-5"`, `"+0530"` |
| `date` | `"1990-01-15"` | `"Jan 15 1990"`, `"15/01/1990"` |
| `time` | `"14:30:00"` (24-hour with seconds) | `"2:30 PM"`, `"14:30"` |
| `sign` (Western horoscope) | lowercase `aries`, `leo` | `"Aries"`, zodiac symbols |
| `fullName` (numerology) | birth certificate name | nickname or married name |
| Numerology dates | `{ year, month, day }` integers | a `birthDate` string |
| Tarot card IDs | `the-fool`, `ace-of-cups` | numeric like `major-01` |
| I Ching hexagram | integer `1..64` | name like `qian` |
| Angel number path param | string `"1111"` | integer `1111` (path validation fails) |

## Domain gotchas

- Vedic endpoints apply Lahiri ayanamsa server-side. Do NOT subtract ayanamsa client-side.
- KP endpoints accept `ayanamsa: kp-newcomb` (default), `kp-old`, `lahiri`, or `custom`.
- Tithi count is 30 (15 Shukla + 15 Krishna). Older training data conflates Purnima and Amavasya.
- Rahu and Ketu are shadow points, not planets. Use `nodeType: "mean"` (default, traditional Vedic) or `"true"` (osculating).
- Western charts take the same `nodeType`, defaulting to `"true"` (what most Western software reports). Pass `"mean"` to match a mean-node calculator. Human Design defaults to `"true"` too.
- Nakshatra count is 27 (Abhijit is not used here).
- Retrograde is per-planet. Read `isRetrograde` per planet, never "Mercury retrograde globally".
- Seed-based daily endpoints are deterministic per (seed, date). Same input = same output.
- Western charts must respect DST. Vedic defaults to IST 5.5 which has no DST.

## What NOT to do

- Do NOT put a secret `sk_` key in browser code; it leaks. For client-side or widget use mint a publishable `pk_` key and lock it to your origins.
- Do NOT ask for batch endpoints. They do not exist; one request per call is the contract.
- Do NOT build a custom ephemeris, human design engine, forecast timeline, tarot shuffler, or numerology calculator. RoxyAPI ships verified versions.
- Do NOT guess endpoint paths. A 404 on a wrong path returns a `suggestions` array of the closest valid ones.
- Do NOT generate validation logic that rejects non-canonical angel numbers (`/lookup` works for any positive integer).
- Do NOT mix tropical and sidereal results. Use the Western or Vedic endpoint that matches the user's tradition.

## Where to look up specifics

- The contract: `https://roxyapi.com/api/v2/openapi.json`, queried with the jq recipe above.
- Per-domain markdown and Remote MCP server: `https://roxyapi.com/products/{slug}.md` and `https://roxyapi.com/mcp/{domain}`, for example `https://roxyapi.com/products/astrology-api.md` and `https://roxyapi.com/mcp/astrology`.
- Docs MCP (no key): `https://roxyapi.com/mcp/docs`, one tool `search_docs`, searches this whole reference live.
- Interactive playground: `https://roxyapi.com/api-reference` (browse endpoints, paste your key to test live)
- Product facts and evidence: `https://roxyapi.com/llms.txt`
- Deep reference dump: `https://roxyapi.com/llms-full.txt` (~386 KB, all docs inlined)
- Blog tutorials: latest 8 listed at the bottom of `https://roxyapi.com/llms.txt`; append `.md` to any post URL.
- Methodology and verified accuracy: `https://roxyapi.com/methodology`.
- Account and help: get a key at `https://roxyapi.com/checkout`, manage keys and usage at `https://roxyapi.com/account` (`GET /usage` returns the same quota in code), plans at `https://roxyapi.com/pricing`, what shipped at `https://roxyapi.com/changelog`, a human at `https://roxyapi.com/contact`. Every public page: `https://roxyapi.com/sitemap.txt`.

### Docs pages

Paths under `https://roxyapi.com`; a `.md` path is markdown, fetch it whole with `curl -s` rather than a summarizing web tool.

- Getting Started: `/docs/introduction.md`, `/docs/quickstart.md`, `/docs/authentication.md`, `/docs/errors.md`, `/docs/versioning.md`, `/docs/data-protection.md`
- Build With RoxyAPI: `/docs/sdk.md`, `/docs/ui.md`, `/docs/widgets.md`, `/docs/tutorials/ai-chat-widgets.md`, `/docs/prompts.md`, `/docs/mcp`, `/docs/templates.md`, `/docs/guides/claude-code.md`, `/docs/guides/cursor.md`, `/docs/guides/antigravity.md`, `/docs/guides/codex.md`, `/docs/guides/windsurf.md`, `/docs/guides/github-copilot.md`, `/docs/guides/gemini-cli.md`, `/docs/guides/replit.md`, `/docs/guides/function-calling.md`, `/docs/guides/postman.md`, `/docs/guides/calculation-engine.md`, `/docs/guides/localization.md`, `/docs/guides/caching.md`
- Agent Reference: `/docs/agent-tasks.md`, `/docs/agent-mistakes.md`, `/docs/agent-gotchas.md`, `/docs/agent-field-formats.md`, `/docs/coverage.md`
- Integrations: `/docs/integrations/nextjs.md`, `/docs/integrations/wordpress.md`, `/docs/integrations/supabase.md`, `/docs/integrations/lovable.md`, `/docs/integrations/bolt.md`, `/docs/integrations/bubble.md`, `/docs/integrations/flutterflow.md`, `/docs/integrations/shopify.md`, `/docs/integrations/wix.md`, `/docs/integrations/squarespace.md`, `/docs/integrations/make.md`, `/docs/integrations/zapier.md`, `/docs/integrations/n8n.md`, `/docs/integrations/dify.md`, `/docs/integrations/whatsapp.md`, `/docs/integrations/telegram.md`, `/docs/integrations/slack.md`
- What To Build: `/docs/tutorials/complete-birth-profile.md`, `/docs/tutorials/dating-app.md`, `/docs/tutorials/horoscope-widget.md`, `/docs/tutorials/tarot-app.md`, `/docs/tutorials/ai-chatbot.md`, `/docs/tutorials/ai-companion-with-memory.md`, `/docs/tutorials/personalized-tracker.md`, `/docs/tutorials/vastu-property-report.md`
- Domain Guides: `/docs/guides/astrology.md`, `/docs/guides/vedic-astrology.md`, `/docs/guides/kp.md`, `/docs/guides/forecast.md`, `/docs/guides/human-design.md`, `/docs/guides/chinese-astrology.md`, `/docs/guides/feng-shui.md`, `/docs/guides/mesoamerican-astrology.md`, `/docs/guides/vastu.md`, `/docs/guides/numerology.md`, `/docs/guides/kabbalah.md`, `/docs/guides/tarot.md`, `/docs/guides/biorhythm.md`, `/docs/guides/ayurveda.md`, `/docs/guides/iching.md`, `/docs/guides/crystals.md`, `/docs/guides/dreams.md`, `/docs/guides/angel-numbers.md`

When done, the user has a working app and a single API key. No multi-product subscription, no OAuth dance, no Docker.
