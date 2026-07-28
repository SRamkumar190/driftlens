/**
 * Runs the DriftLens investigation pipeline (drift_investigation.pipe).
 *
 * Flow:  webhook_1 -> prompt_1 -> llm_anthropic_1 -> guardrails_1 -> response_answers_1
 *
 * Usage:
 *   npx tsx investigate.ts                                  # built-in controller_01 payload
 *   npx tsx investigate.ts payload.controller_01.json        # payload from a file
 *   npx tsx investigate.ts --frontend                        # 5-field frontend shape
 *   npx tsx investigate.ts --persist                         # also save to InsForge as "pending"
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RocketRideClient } from 'rocketride';
import {
	assertValidPayload,
	reconcile,
	toFrontendResult,
	InvalidStatusError,
	MissingFieldsError,
	type InvestigationPayload,
	type InvestigationResult,
} from './statusMap.js';
import { loadEnv } from './loadEnv.js';
import {
	isConfigured as insforgeConfigured,
	saveInvestigation,
	type StoredInvestigation,
} from './insforgeStore.js';

loadEnv();

const HERE = dirname(fileURLToPath(import.meta.url));
const PIPELINE = resolve(HERE, 'drift_investigation.pipe');

/** The key set by `laneName` on the response_answers_1 node. */
const RESPONSE_LANE = 'investigation';

/** The agreed demo payload from Person 2 (HydraDB + Pipeshift output). */
const SAMPLE_PAYLOAD: InvestigationPayload = {
	component_id: 'controller_01',
	status: 'unreviewed_drift',
	reviewed_value: '5 seconds',
	implemented_value: '7 seconds',
	confidence: 0.96,
	drive_evidence: 'Reviewed motor timeout is 5 seconds',
	slack_evidence: null,
	linear_evidence: null,
	github_evidence: 'MOTOR_TIMEOUT_SECONDS = 7',
};

/** Pull the pipeline's JSON object out of whatever the answers lane returned. */
function extractAnswer(raw: unknown): Partial<InvestigationResult> | null {
	const candidates = Array.isArray(raw) ? raw : [raw];
	for (const candidate of candidates) {
		let value: unknown = candidate;
		// Answers may arrive as an object wrapper or as a raw/fenced JSON string.
		if (value && typeof value === 'object' && 'answer' in value) {
			value = (value as { answer: unknown }).answer;
		}
		if (typeof value === 'string') {
			const cleaned = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
			try {
				value = JSON.parse(cleaned);
			} catch {
				continue;
			}
		}
		if (value && typeof value === 'object') {
			return value as Partial<InvestigationResult>;
		}
	}
	return null;
}

export interface InvestigateOptions {
	/** Persist the result to InsForge with review_status "pending". */
	persist?: boolean;
	componentName?: string | null;
}

export async function investigate(
	payload: InvestigationPayload,
	options: InvestigateOptions = {},
): Promise<InvestigationResult> {
	// Deterministic gate: a bad status never reaches the LLM.
	assertValidPayload(payload);

	const client = new RocketRideClient();
	try {
		await client.connect();

		const pipeline = JSON.parse(readFileSync(PIPELINE, 'utf8'));
		const validation = await client.validate({ pipeline });
		if (validation?.errors?.length) {
			throw new Error(`Pipeline invalid:\n  ${validation.errors.join('\n  ')}`);
		}
		for (const warning of validation?.warnings ?? []) {
			console.warn(`[pipeline warning] ${warning}`);
		}

		const { token } = await client.use({ filepath: PIPELINE });
		const response = await client.send(
			token,
			JSON.stringify(payload),
			undefined,
			'application/json',
		);

		const returned = extractAnswer(response?.[RESPONSE_LANE]);
		if (!returned) {
			console.warn(
				`[warn] no parsable JSON on the "${RESPONSE_LANE}" lane; falling back to the canonical mapping.`,
			);
		}

		const { result, mismatches } = reconcile(payload, returned);
		for (const mismatch of mismatches) {
			console.warn(`[drift in pipeline output] ${mismatch}`);
		}

		if (options.persist) {
			if (!insforgeConfigured()) {
				console.warn(
					'[insforge] skipped: INSFORGE_URL / INSFORGE_API_KEY not set (run: npx @insforge/cli link)',
				);
			} else {
				// Persistence must not lose an otherwise-good result.
				try {
					const stored: StoredInvestigation = await saveInvestigation(result, {
						componentName: options.componentName ?? null,
					});
					console.warn(
						`[insforge] saved investigation ${stored.id} (review_status=${stored.review_status})`,
					);
				} catch (error) {
					console.warn(`[insforge] save failed: ${(error as Error).message}`);
				}
			}
		}

		return result;
	} finally {
		await client.disconnect();
	}
}

async function main() {
	const args = process.argv.slice(2);
	const frontendOnly = args.includes('--frontend');
	const persist = args.includes('--persist');
	const file = args.find((arg) => !arg.startsWith('--'));

	const payload: InvestigationPayload = file
		? JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'))
		: SAMPLE_PAYLOAD;

	try {
		const result = await investigate(payload, { persist });
		console.log(JSON.stringify(frontendOnly ? toFrontendResult(result) : result, null, 2));
	} catch (error) {
		if (error instanceof InvalidStatusError || error instanceof MissingFieldsError) {
			console.error(`Invalid payload: ${error.message}`);
			process.exit(2);
		}
		throw error;
	}
}

// pathToFileURL, not string concat: on Windows a raw `file://C:/...` has two
// slashes where import.meta.url has three, so the comparison never matched.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
