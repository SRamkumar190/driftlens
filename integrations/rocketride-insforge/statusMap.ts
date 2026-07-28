/**
 * Canonical status -> (conclusion, recommended_action) table for DriftLens.
 *
 * This is the single source of truth. The RocketRide pipeline
 * (drift_investigation.pipe) carries the same table in its `prompt` node
 * instructions, but an LLM is not a deterministic string emitter, so
 * `reconcile()` below re-asserts these exact strings on the way out.
 *
 * If you change a string here, change it in drift_investigation.pipe too.
 */

export const DRIFT_STATUSES = [
	'matches_design',
	'verification_incomplete',
	'unreviewed_drift',
	'insufficient_evidence',
] as const;

export type DriftStatus = (typeof DRIFT_STATUSES)[number];

/** Payload the webhook accepts. Mirrors shared/types.ts minus the derived fields. */
export interface InvestigationPayload {
	component_id: string;
	status: string;
	reviewed_value: string | null;
	implemented_value: string | null;
	confidence: number;
	drive_evidence: string | null;
	slack_evidence: string | null;
	linear_evidence: string | null;
	github_evidence: string | null;
}

export interface InvestigationResult extends InvestigationPayload {
	status: DriftStatus;
	conclusion: string;
	recommended_action: string;
}

export const STATUS_MAP: Record<DriftStatus, { conclusion: string; recommended_action: string }> = {
	unreviewed_drift: {
		conclusion: 'Implementation changed without complete review evidence.',
		recommended_action: 'Send for engineering and quality review.',
	},
	verification_incomplete: {
		conclusion:
			'The change has a documented reason and assessment, but verification cannot be confirmed.',
		recommended_action:
			'Draft a verification-review task and attach the related specification, discussion, code change, and existing assessment.',
	},
	matches_design: {
		conclusion: 'Current implementation matches the reviewed specification. No drift detected.',
		recommended_action: 'No action required.',
	},
	insufficient_evidence: {
		conclusion:
			'Not enough cross-system evidence exists yet to classify this component with confidence.',
		recommended_action:
			'Connect remaining sources or confirm the current implementation value before classifying.',
	},
};

/** Frontend-ready projection: the narrow shape the demo returns to the UI. */
export interface FrontendResult {
	component_id: string;
	status: DriftStatus;
	confidence: number;
	conclusion: string;
	recommended_action: string;
}

export class InvalidStatusError extends Error {
	constructor(public readonly received: unknown) {
		super(
			`status must be one of ${DRIFT_STATUSES.join(', ')} — received ${JSON.stringify(received)}`,
		);
		this.name = 'InvalidStatusError';
	}
}

export class MissingFieldsError extends Error {
	constructor(public readonly fields: string[]) {
		super(`payload is missing required field(s): ${fields.join(', ')}`);
		this.name = 'MissingFieldsError';
	}
}

export function isDriftStatus(value: unknown): value is DriftStatus {
	return typeof value === 'string' && (DRIFT_STATUSES as readonly string[]).includes(value);
}

/**
 * Fields that must be present on the incoming HydraDB/Pipeshift JSON.
 * The four `*_evidence` fields are required as keys but may be null — a null
 * evidence field is meaningful (that source had nothing to say).
 */
const REQUIRED_FIELDS = [
	'component_id',
	'status',
	'reviewed_value',
	'implemented_value',
	'confidence',
	'drive_evidence',
	'slack_evidence',
	'linear_evidence',
	'github_evidence',
] as const;

/**
 * Hard gate before the payload is sent to the pipeline: checks required fields
 * are present and the status is in the enum, so a malformed classification
 * never reaches the LLM or InsForge.
 */
export function assertValidPayload(payload: InvestigationPayload): DriftStatus {
	if (!payload || typeof payload !== 'object') {
		throw new MissingFieldsError([...REQUIRED_FIELDS]);
	}

	const missing = REQUIRED_FIELDS.filter((field) => !(field in payload));
	if (missing.length) {
		throw new MissingFieldsError(missing);
	}

	if (typeof payload.component_id !== 'string' || !payload.component_id.trim()) {
		throw new MissingFieldsError(['component_id']);
	}
	if (typeof payload.confidence !== 'number' || Number.isNaN(payload.confidence)) {
		throw new MissingFieldsError(['confidence']);
	}
	if (!isDriftStatus(payload.status)) {
		throw new InvalidStatusError((payload as { status?: unknown })?.status);
	}

	return payload.status;
}

/** Narrow a full ComponentResult-shaped result to the frontend response shape. */
export function toFrontendResult(result: InvestigationResult): FrontendResult {
	return {
		component_id: result.component_id,
		status: result.status,
		confidence: result.confidence,
		conclusion: result.conclusion,
		recommended_action: result.recommended_action,
	};
}

/**
 * Re-assert the canonical conclusion / recommended_action over whatever the
 * pipeline returned, and pass the original input fields through untouched.
 *
 * `pipelineOutput` is accepted for drift-detection only: if the LLM reworded a
 * string, we keep the canonical version and report the mismatch.
 */
export function reconcile(
	payload: InvestigationPayload,
	pipelineOutput?: Partial<InvestigationResult> | null,
): { result: InvestigationResult; mismatches: string[] } {
	const status = assertValidPayload(payload);
	const canonical = STATUS_MAP[status];
	const mismatches: string[] = [];

	for (const field of ['conclusion', 'recommended_action'] as const) {
		const returned = pipelineOutput?.[field];
		if (typeof returned === 'string' && returned.trim() !== canonical[field]) {
			mismatches.push(
				`${field}: pipeline returned ${JSON.stringify(returned)}, expected ${JSON.stringify(canonical[field])}`,
			);
		}
	}

	return {
		result: {
			component_id: payload.component_id,
			status,
			reviewed_value: payload.reviewed_value ?? null,
			implemented_value: payload.implemented_value ?? null,
			confidence: payload.confidence,
			drive_evidence: payload.drive_evidence ?? null,
			slack_evidence: payload.slack_evidence ?? null,
			linear_evidence: payload.linear_evidence ?? null,
			github_evidence: payload.github_evidence ?? null,
			conclusion: canonical.conclusion,
			recommended_action: canonical.recommended_action,
		},
		mismatches,
	};
}
