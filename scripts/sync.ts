/**
 * Regenerates the plugin artifacts from the public RoxyAPI OpenAPI spec and agent playbook.
 *
 * @remarks
 * Sources, both fetched fresh each run, nothing vendored: the combined spec at /api/v2/openapi.json (the same single spec the SDKs generate from) for the domain keyword list, and the playbook at /AGENTS.md for the Skill body. Outputs five files: skills/roxyapi/SKILL.md, .mcp.json, .claude-plugin/{plugin,marketplace}.json, and .cursor-plugin/plugin.json. New domains appear in the keywords automatically.
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

/** The editors this repo ships a manifest for. Both load the same skills/ directory and the same keyless Docs MCP. */
const HOSTS = {
	claude: { name: 'Claude Code', keyword: 'claude-code', agent: 'Claude' },
	cursor: { name: 'Cursor', keyword: 'cursor', agent: 'the Cursor agent' },
} as const;

type Host = (typeof HOSTS)[keyof typeof HOSTS];

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

function buildMcpConfig() {
	return {
		mcpServers: {
			'roxy-docs': {
				type: 'http',
				url: DOCS_MCP_URL,
			},
		},
	};
}

function keywords(slugs: string[], host: Host): string[] {
	return [...new Set([host.keyword, ...FIXED_KEYWORDS, ...slugs])];
}

function buildPlugin(slugs: string[], host: Host) {
	return {
		name: 'roxyapi',
		description: `RoxyAPI multi domain spiritual intelligence API and Remote MCP for ${host.name}. Auto connects the keyless Docs MCP and ships a skill that teaches ${host.agent} how to build natal charts, Vedic kundli, forecasts, human design, Chinese astrology, feng shui, numerology, tarot, and more, all under one key.`,
		author: { name: 'RoxyAPI' },
		homepage: 'https://roxyapi.com',
		repository: 'https://github.com/RoxyAPI/claude-plugin',
		license: 'MIT',
		keywords: keywords(slugs, host),
	};
}

/** Cursor manifest. Skills come from folder discovery of skills/. The Docs MCP is inline because Cursor discovers mcp.json, not .mcp.json, and infers the transport from `url`. */
function buildCursorPlugin(slugs: string[]) {
	return {
		...buildPlugin(slugs, HOSTS.cursor),
		logo: 'assets/logo.png',
		mcpServers: { 'roxy-docs': { url: DOCS_MCP_URL } },
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
				keywords: keywords(slugs, HOSTS.claude),
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
	const plugin = buildPlugin(slugs, HOSTS.claude);
	const marketplace = buildMarketplace(slugs);
	const cursorPlugin = buildCursorPlugin(slugs);

	if (DRY_RUN) {
		console.log(
			'built: SKILL.md, .mcp.json, plugin.json, marketplace.json, cursor plugin.json (validated, not written)',
		);
		return;
	}

	await Promise.all([
		Bun.write(SKILL_PATH, skill),
		writeJson(MCP_PATH, mcp),
		writeJson(PLUGIN_PATH, plugin),
		writeJson(MARKETPLACE_PATH, marketplace),
		writeJson(CURSOR_PLUGIN_PATH, cursorPlugin),
	]);

	console.log(
		'wrote: skills/roxyapi/SKILL.md, .mcp.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, .cursor-plugin/plugin.json',
	);
}

await main();
