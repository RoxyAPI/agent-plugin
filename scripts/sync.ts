/**
 * Regenerates the plugin artifacts from the public RoxyAPI OpenAPI spec and agent playbook.
 *
 * @remarks
 * Sources, both fetched fresh each run, nothing vendored: the combined spec at /api/v2/openapi.json (the same single spec the SDKs generate from) for the domain keyword list, and the playbook at /AGENTS.md for the Skill body. Outputs seven files: skills/roxyapi/SKILL.md; the open Agent Plugins package (plugin.json, mcp.json) that Cursor, Codex, VS Code and other compatible clients load; .claude-plugin/{plugin,marketplace}.json with .mcp.json for Claude Code; and .cursor-plugin/plugin.json for the Cursor logo. New domains appear in the keywords automatically.
 *
 * Run `bun run sync` to write the artifacts, or `bun run sync --dry-run` to build and validate without writing (CI and the pre-push hook use this). The sync workflow commits the result only when it differs.
 */

import { join } from 'node:path';

const API_ORIGIN = 'https://roxyapi.com';
const COMBINED_SPEC_URL = `${API_ORIGIN}/api/v2/openapi.json`;
const AGENTS_URL = `${API_ORIGIN}/AGENTS.md`;
const DOCS_MCP_URL = `${API_ORIGIN}/mcp/docs`;

const ROOT = join(import.meta.dir, '..');
const SKILL_PATH = join(ROOT, 'skills', 'roxyapi', 'SKILL.md');
const MCP_PATH = join(ROOT, '.mcp.json');
const PLUGIN_PATH = join(ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_PATH = join(ROOT, '.claude-plugin', 'marketplace.json');
const CURSOR_PLUGIN_PATH = join(ROOT, '.cursor-plugin', 'plugin.json');
const AGENT_PLUGIN_PATH = join(ROOT, 'plugin.json');
const AGENT_MCP_PATH = join(ROOT, 'mcp.json');

/** Agent Plugins (agent-plugins.org) schema version the root manifest and mcp.json target. */
const AGENT_PLUGINS_SCHEMAS = 'https://agent-plugins.org/schemas/1.1.0';

const DOCS_MCP_NAME = 'roxy-docs';

/** Directory listing copy, shared by every client that is not Claude Code. Counts are floors so the text stays true as the API grows. */
const LISTING_DESCRIPTION =
	'The Spiritual OS layer for agentic AI: Western and Vedic astrology, human design, numerology, tarot and 18+ insight domains on one API key. Installs a skill plus the keyless Docs MCP, so your coding agent writes RoxyAPI integrations against real endpoints and fields. 250+ hosted Remote MCP tools, no local setup. Verified against NASA JPL Horizons with 3,500+ gold-standard tests. Flat pricing, typed SDKs, MIT UI components and templates, 10+ languages, no AGPL.';

/** Marketing keywords that are not domain slugs. Merged with the host keyword and the discovered slugs for plugin and marketplace discovery. */
const FIXED_KEYWORDS = [
	'roxyapi',
	'mcp',
	'remote-mcp',
	'agent-skill',
	'astrology-api',
	'spiritual',
	'divination',
	'natal-chart',
	'kundli',
	'horoscope',
];

/** App-utility path segments (not insight domains). Excluded from discovery keywords so an astrology plugin is not tagged "usage" or "languages". The only thing here that is not a product domain. */
const UTILITY_SEGMENTS = new Set(['usage', 'languages']);

const DRY_RUN = new Set(process.argv.slice(2)).has('--dry-run');

/** Bypass edge cache so generation always reflects the freshest origin, not a stale CDN node. */
const NO_CACHE: RequestInit = { headers: { 'Cache-Control': 'no-cache' } };

interface OpenAPISpec {
	paths: Record<string, unknown>;
}

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url, NO_CACHE);
	if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
	return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url, NO_CACHE);
	if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
	return res.text();
}

function writeJson(path: string, data: unknown): Promise<number> {
	return Bun.write(path, `${JSON.stringify(data, null, '\t')}\n`);
}

/** Domain slugs from the combined spec: distinct first path segments, in spec order, minus the app-utility routes. One spec, no per-domain fetch (the SDKs generate from this same combined spec). */
async function discoverDomainSlugs(): Promise<string[]> {
	const combined = await fetchJson<OpenAPISpec>(COMBINED_SPEC_URL);
	const slugs: string[] = [];
	const seen = new Set<string>();
	for (const path of Object.keys(combined.paths)) {
		const segment = path.split('/')[1];
		if (segment && !seen.has(segment) && !UTILITY_SEGMENTS.has(segment)) {
			seen.add(segment);
			slugs.push(segment);
		}
	}
	return slugs;
}

/** The Docs MCP is POST-only Streamable HTTP, so a GET returns 405 when it exists and 404 when it is gone. Fail the run on 404 so a removed endpoint never ships a dead config. */
async function assertDocsMcp(): Promise<void> {
	const res = await fetch(DOCS_MCP_URL);
	if (res.status === 404)
		throw new Error(`Docs MCP missing: GET ${DOCS_MCP_URL} -> 404`);
}

/** Skill: a stable model-invocation trigger over the live agent playbook (/AGENTS.md verbatim). The trigger lists concrete user intents, which fire model invocation more reliably than a domain-title list, and the playbook body already enumerates every domain. */
function buildSkill(playbook: string): string {
	const description = `Use RoxyAPI to build or integrate any astrology, divination, or insight feature. RoxyAPI is a multi domain API with Remote MCP under one key. Invoke when the user is building or asking about natal charts, horoscopes, Vedic kundli, panchang, synastry or compatibility, tarot readings, numerology reports, human design charts, transits or forecasts, BaZi four pillars or Chinese zodiac, feng shui flying stars or Kua numbers, Mayan day signs or the Aztec calendar, Vastu, gematria or the 72 names, Ayurvedic constitution, biorhythm, I Ching, crystals, dream meanings, angel numbers, or city and timezone lookup, or any prediction, divination, or self knowledge app, agent, chatbot, or MCP integration. Covers endpoints, X-API-Key auth, the location first rule, typed SDKs, and Remote MCP.`;
	return `---\nname: roxyapi\ndescription: ${description}\n---\n\n${playbook.trimStart()}`;
}

/** Claude Code MCP config (.mcp.json). */
function buildMcpConfig() {
	return {
		mcpServers: { [DOCS_MCP_NAME]: { type: 'http', url: DOCS_MCP_URL } },
	};
}

/** Agent Plugins MCP config (mcp.json), which names the transport explicitly. */
function buildAgentMcpConfig() {
	return {
		$schema: `${AGENT_PLUGINS_SCHEMAS}/mcp.schema.json`,
		mcpServers: {
			[DOCS_MCP_NAME]: { type: 'streamable-http', url: DOCS_MCP_URL },
		},
	};
}

/** `hostKeyword` leads so each client indexes its own name. */
function keywords(slugs: string[], hostKeyword: string): string[] {
	return [...new Set([hostKeyword, ...FIXED_KEYWORDS, ...slugs])];
}

/** Manifest fields every format shares. */
function manifest(slugs: string[], hostKeyword: string, description: string) {
	return {
		name: 'roxyapi',
		description,
		author: { name: 'RoxyAPI' },
		homepage: 'https://roxyapi.com',
		repository: 'https://github.com/RoxyAPI/claude-plugin',
		license: 'MIT',
		keywords: keywords(slugs, hostKeyword),
	};
}

function buildPlugin(slugs: string[]) {
	return manifest(
		slugs,
		'claude-code',
		'RoxyAPI multi domain spiritual intelligence API and Remote MCP for Claude Code. Auto connects the keyless Docs MCP and ships a skill that teaches Claude how to build natal charts, Vedic kundli, forecasts, human design, Chinese astrology, feng shui, numerology, tarot, and more, all under one key.',
	);
}

/** Root Agent Plugins manifest. Skills come from skills/, the Docs MCP from mcp.json, both at their fixed locations. */
function buildAgentPlugin(slugs: string[]) {
	return {
		$schema: `${AGENT_PLUGINS_SCHEMAS}/plugin.schema.json`,
		...manifest(slugs, 'agent-plugin', LISTING_DESCRIPTION),
	};
}

/** Cursor manifest, kept only for the marketplace logo; skills/ and mcp.json load by Cursor folder discovery. */
function buildCursorPlugin(slugs: string[]) {
	return {
		...manifest(slugs, 'cursor', LISTING_DESCRIPTION),
		logo: 'assets/logo.png',
	};
}

function buildMarketplace(slugs: string[]) {
	return {
		name: 'roxyapi',
		owner: { name: 'RoxyAPI' },
		description:
			'RoxyAPI: the multi domain spiritual intelligence API and Remote MCP. One plugin connects Claude Code to verified astrology, Vedic, forecast, human design, Chinese astrology, feng shui, numerology, tarot, and more.',
		plugins: [
			{
				name: 'roxyapi',
				source: './',
				description:
					'Connects Claude Code to RoxyAPI: a keyless Docs MCP for live endpoint lookup plus a skill that teaches Claude how to build on every RoxyAPI domain under one key.',
				category: 'api',
				keywords: keywords(slugs, 'claude-code'),
				homepage: 'https://roxyapi.com',
				repository: 'https://github.com/RoxyAPI/claude-plugin',
				license: 'MIT',
			},
		],
	};
}

async function main(): Promise<void> {
	console.log(DRY_RUN ? 'sync: DRY RUN (no writes)\n' : 'sync: live\n');

	const [slugs, playbook] = await Promise.all([
		discoverDomainSlugs(),
		fetchText(AGENTS_URL),
		assertDocsMcp(),
	]);

	if (!slugs.length)
		throw new Error('no domains discovered from the combined spec');
	if (playbook.length < 1000)
		throw new Error(
			`/AGENTS.md too short (${playbook.length} bytes), refusing to ship`,
		);

	console.log(`discovered ${slugs.length} domains: ${slugs.join(', ')}`);
	console.log(`playbook: ${playbook.length} bytes from ${AGENTS_URL}\n`);

	const skill = buildSkill(playbook);
	const mcp = buildMcpConfig();
	const plugin = buildPlugin(slugs);
	const marketplace = buildMarketplace(slugs);
	const cursorPlugin = buildCursorPlugin(slugs);
	const agentPlugin = buildAgentPlugin(slugs);
	const agentMcp = buildAgentMcpConfig();

	if (DRY_RUN) {
		console.log(
			'built: SKILL.md, plugin.json, mcp.json, .mcp.json, Claude and Cursor manifests (validated, not written)',
		);
		return;
	}

	await Promise.all([
		Bun.write(SKILL_PATH, skill),
		writeJson(MCP_PATH, mcp),
		writeJson(PLUGIN_PATH, plugin),
		writeJson(MARKETPLACE_PATH, marketplace),
		writeJson(CURSOR_PLUGIN_PATH, cursorPlugin),
		writeJson(AGENT_PLUGIN_PATH, agentPlugin),
		writeJson(AGENT_MCP_PATH, agentMcp),
	]);

	console.log(
		'wrote: skills/roxyapi/SKILL.md, plugin.json, mcp.json, .mcp.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, .cursor-plugin/plugin.json',
	);
}

await main();
