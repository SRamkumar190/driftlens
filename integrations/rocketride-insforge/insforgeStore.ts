/**
 * InsForge persistence for DriftLens investigations.
 *
 * Uses createAdminClient: this runs server-side as the integration, not as an
 * end user, and the admin key bypasses RLS so it can write to tables that are
 * read-only for anon/authenticated callers (see insforge/schema.sql).
 *
 * Requires INSFORGE_URL and INSFORGE_API_KEY. If either is absent,
 * `isConfigured()` returns false and callers should skip persistence rather
 * than fail the investigation.
 */

import { createAdminClient } from '@insforge/sdk';
import type { InvestigationResult } from './statusMap.js';

export const INTENT_PROFILES_TABLE = 'driftlens_intent_profiles';
export const INVESTIGATIONS_TABLE = 'driftlens_investigations';

export type ReviewStatus = 'pending' | 'in_review' | 'accepted' | 'rejected';

export interface IntentProfile {
	id: string;
	name: string;
	description: string | null;
	config: Record<string, unknown>;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface StoredInvestigation extends Omit<InvestigationResult, 'component_name'> {
	id: string;
	intent_profile_id: string | null;
	component_name: string | null;
	review_status: ReviewStatus;
	created_at: string;
	updated_at: string;
}

export function isConfigured(): boolean {
	return Boolean(process.env.INSFORGE_URL?.trim() && process.env.INSFORGE_API_KEY?.trim());
}

function client() {
	if (!isConfigured()) {
		throw new Error(
			'InsForge is not configured — set INSFORGE_URL and INSFORGE_API_KEY in .env. ' +
				'Link the project first with: npx @insforge/cli link',
		);
	}
	return createAdminClient({
		baseUrl: process.env.INSFORGE_URL!,
		apiKey: process.env.INSFORGE_API_KEY!,
	});
}

/** Fail loudly with the InsForge error text rather than a bare null. */
function unwrap<T>(operation: string, res: { data: T; error: unknown }): T {
	if (res.error) {
		const detail =
			typeof res.error === 'string' ? res.error : JSON.stringify(res.error, null, 2);
		throw new Error(`InsForge ${operation} failed: ${detail}`);
	}
	return res.data;
}

/**
 * Read the active intent profile, creating the `default` row if the table is
 * empty (schema.sql seeds it, but this keeps a fresh backend working).
 */
export async function ensureActiveIntentProfile(
	name = 'default',
): Promise<IntentProfile> {
	const db = client().database;

	const existing = unwrap(
		'select intent profile',
		await db
			.from(INTENT_PROFILES_TABLE)
			.select('id, name, description, config, is_active, created_at, updated_at')
			.eq('name', name)
			.maybeSingle(),
	) as IntentProfile | null;

	if (existing) return existing;

	const inserted = unwrap(
		'insert intent profile',
		await db
			.from(INTENT_PROFILES_TABLE)
			.insert([
				{
					name,
					description:
						'Cross-system drift review across Google Drive, Slack, Linear, and GitHub.',
					config: { sources: ['drive', 'slack', 'linear', 'github'] },
					is_active: true,
				},
			])
			.select(),
	) as IntentProfile[];

	return inserted[0];
}

/**
 * Append one investigation result with review_status "pending".
 * Append-only by design: a re-run never overwrites an earlier classification.
 */
export async function saveInvestigation(
	result: InvestigationResult,
	options: { componentName?: string | null; intentProfileId?: string | null } = {},
): Promise<StoredInvestigation> {
	const db = client().database;

	const intentProfileId =
		options.intentProfileId ?? (await ensureActiveIntentProfile()).id ?? null;

	const rows = unwrap(
		'insert investigation',
		await db
			.from(INVESTIGATIONS_TABLE)
			.insert([
				{
					intent_profile_id: intentProfileId,
					component_id: result.component_id,
					component_name: options.componentName ?? result.component_name,
					status: result.status,
					reviewed_value: result.reviewed_value,
					implemented_value: result.implemented_value,
					confidence: result.confidence,
					drive_evidence: result.drive_evidence,
					slack_evidence: result.slack_evidence,
					linear_evidence: result.linear_evidence,
					github_evidence: result.github_evidence,
					conclusion: result.conclusion,
					recommended_action: result.recommended_action,
					review_status: 'pending' satisfies ReviewStatus,
				},
			])
			.select(),
	) as StoredInvestigation[];

	return rows[0];
}

/** Latest stored result for one component — the frontend's main read. */
export async function getLatestInvestigation(
	componentId: string,
): Promise<StoredInvestigation | null> {
	const db = client().database;
	const rows = unwrap(
		'select latest investigation',
		await db
			.from(INVESTIGATIONS_TABLE)
			.select('*')
			.eq('component_id', componentId)
			.order('created_at', { ascending: false })
			.limit(1),
	) as StoredInvestigation[];

	return rows[0] ?? null;
}

/** Everything still awaiting a human reviewer. */
export async function listPendingInvestigations(): Promise<StoredInvestigation[]> {
	const db = client().database;
	return unwrap(
		'select pending investigations',
		await db
			.from(INVESTIGATIONS_TABLE)
			.select('*')
			.eq('review_status', 'pending')
			.order('created_at', { ascending: false }),
	) as StoredInvestigation[];
}
