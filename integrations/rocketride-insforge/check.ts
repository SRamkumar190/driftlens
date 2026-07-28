/**
 * Pre-flight check for the DriftLens RocketRide setup.
 * Verifies env vars, pipeline file shape, server connectivity, and that the
 * canonical status mapping is intact — without spending an LLM call.
 *
 * Usage: npx tsx check.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRIFT_STATUSES, STATUS_MAP, reconcile } from './statusMap.js';
import { loadEnv, ENV_CANDIDATES } from './loadEnv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIPELINE = resolve(HERE, 'drift_investigation.pipe');
const LOADED_ENV = loadEnv();

/** Engine issues come back as objects, so String() would give [object Object]. */
function describe(issue: unknown): string {
	if (typeof issue === 'string') return issue;
	if (issue && typeof issue === 'object') {
		const o = issue as Record<string, unknown>;
		const text = o.message ?? o.error ?? o.detail ?? o.description;
		const where = o.component ?? o.id ?? o.node ?? o.path;
		if (typeof text === 'string') return where ? `${where}: ${text}` : text;
		return JSON.stringify(issue);
	}
	return String(issue);
}

function formatIssues(issues: unknown[]): string {
	return issues.map((i) => `        - ${describe(i)}`).join('\n');
}

let failures = 0;
const pass = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
	console.error(`  FAIL  ${m}`);
	failures++;
};

async function main() {
	console.log('DriftLens RocketRide pre-flight\n');

	console.log('Environment');
	if (LOADED_ENV.length) pass(`loaded .env from ${LOADED_ENV.join(', ')}`);
	else
		fail(
			`no .env found — copy env.example to one of:\n        ${ENV_CANDIDATES.join('\n        ')}`,
		);
	for (const key of ['ROCKETRIDE_URI', 'ROCKETRIDE_APIKEY', 'ROCKETRIDE_ANTHROPIC_KEY']) {
		if (process.env[key]?.trim()) pass(`${key} is set`);
		else fail(`${key} is missing — add it to .env`);
	}

	console.log('\nPipeline file');
	if (!existsSync(PIPELINE)) {
		fail(`drift_investigation.pipe not found at ${PIPELINE}`);
		process.exit(1);
	}
	pass('drift_investigation.pipe exists');

	const raw = readFileSync(PIPELINE, 'utf8');
	let pipeline: any;
	try {
		pipeline = JSON.parse(raw);
		pass('parses as JSON');
	} catch (error) {
		fail(`does not parse as JSON: ${(error as Error).message}`);
		process.exit(1);
	}

	if (Object.keys(pipeline)[0] === 'components') pass('"components" is the first field');
	else fail('"components" must be the first field in the JSON');

	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pipeline.project_id))
		pass(`project_id is a literal GUID (${pipeline.project_id})`);
	else fail(`project_id must be a literal GUID, got ${JSON.stringify(pipeline.project_id)}`);

	if (pipeline.version === 1) pass('version is 1');
	else fail(`version must be 1, got ${JSON.stringify(pipeline.version)}`);

	if (pipeline.viewport && typeof pipeline.viewport === 'object') pass('viewport present');
	else fail('viewport missing');

	const ids: string[] = pipeline.components.map((c: any) => c.id);
	if (new Set(ids).size === ids.length) pass(`component ids unique (${ids.length} nodes)`);
	else fail('duplicate component ids');

	// Every input must reference a component that exists.
	let danglingLanes = 0;
	for (const component of pipeline.components) {
		for (const input of component.input ?? []) {
			if (!ids.includes(input.from)) {
				fail(`${component.id} reads from unknown component "${input.from}"`);
				danglingLanes++;
			}
		}
	}
	if (danglingLanes === 0) pass('all lane inputs reference existing components');

	const sources = pipeline.components.filter((c: any) => c.config?.mode === 'Source');
	if (sources.length === 1) pass(`exactly one source node (${sources[0].id})`);
	else fail(`expected exactly one source node, found ${sources.length}`);

	if (raw.includes('${ROCKETRIDE_ANTHROPIC_KEY}')) pass('LLM key is an env var, not a literal');
	else fail('LLM apikey should use ${ROCKETRIDE_ANTHROPIC_KEY}');

	console.log('\nStatus mapping');
	if (DRIFT_STATUSES.length === 4) pass('4 statuses defined');
	else fail(`expected 4 statuses, found ${DRIFT_STATUSES.length}`);

	for (const status of DRIFT_STATUSES) {
		const entry = STATUS_MAP[status];
		const inPipeline =
			raw.includes(entry.conclusion) && raw.includes(entry.recommended_action);
		if (entry?.conclusion && entry?.recommended_action && inPipeline) {
			pass(`${status} — mapped and present in the prompt node`);
		} else if (!inPipeline) {
			fail(`${status} — strings in statusMap.ts do not match drift_investigation.pipe`);
		} else {
			fail(`${status} — incomplete mapping`);
		}
	}

	// Reconcile is pure, so this is a real check with no network cost.
	const { result } = reconcile({
		component_id: 'check_01',
		status: 'matches_design',
		reviewed_value: null,
		implemented_value: null,
		confidence: 1,
		drive_evidence: null,
		slack_evidence: null,
		linear_evidence: null,
		github_evidence: null,
	});
	if (result.conclusion === STATUS_MAP.matches_design.conclusion) pass('reconcile() returns canonical text');
	else fail('reconcile() did not return canonical text');
	if (result.drive_evidence === null) pass('reconcile() preserves null evidence');
	else fail('reconcile() altered a null evidence field');

	console.log('\nServer');
	try {
		const { RocketRideClient } = await import('rocketride');
		const client = new RocketRideClient();
		try {
			await client.connect();
			pass('connected to RocketRide');
			const validation = await client.validate({ pipeline });
			if (validation?.errors?.length) {
				fail(`engine validate() reported:\n${formatIssues(validation.errors)}`);
			} else {
				pass('engine validated the pipeline');
				for (const warning of validation?.warnings ?? []) {
					console.log(`  warn  ${describe(warning)}`);
				}
			}

			// The decisive check: can this API key actually run a pipeline?
			// Structural validity is already covered above and by the catalog
			// cross-check, so a failure here is almost always key scope.
			try {
				const { token } = await client.use({ pipeline });
				pass(`pipeline started (token ${String(token).slice(0, 12)}…)`);
			} catch (error) {
				const message = (error as Error).message ?? '';
				if (/task\.control|permission/i.test(message)) {
					fail(
						`API key cannot run pipelines: ${message}\n` +
							'        The key authenticates but lacks the task.control permission.\n' +
							'        Fix in RocketRide: use a key with pipeline-execution scope,\n' +
							'        or upgrade/enable the account for task control.',
					);
				} else {
					fail(`could not start the pipeline: ${message}`);
				}
			}
		} finally {
			await client.disconnect();
		}
	} catch (error) {
		fail(`could not reach RocketRide: ${(error as Error).message}`);
	}

	console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
