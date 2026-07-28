import type { RocketRideClient } from 'rocketride';

export interface PipelineValidationResult {
	errors?: unknown[];
	warnings?: unknown[];
	[key: string]: unknown;
}

export interface CompatibleValidation {
	result: PipelineValidationResult;
	usedLegacyWrapper: boolean;
}

/**
 * Validate using the current SDK shape, then retry the legacy server shape
 * only for the distinctive response returned by older RocketRide engines.
 *
 * SDK 1.3 sends `{ pipeline: <flat config> }`. Some hosted engines still
 * expect `{ pipeline: { pipeline: <flat config> } }` for rrext_validate and
 * otherwise return ccode 40 while echoing `pipeline.components = null`.
 */
export async function validatePipeline(
	client: RocketRideClient,
	pipeline: Record<string, unknown>,
): Promise<CompatibleValidation> {
	const current = (await client.validate({ pipeline })) as PipelineValidationResult;
	const errors = current.errors ?? [];
	const rejectedAsMissingPipeline = errors.some((issue) => {
		if (!issue || typeof issue !== 'object') return false;
		const candidate = issue as Record<string, unknown>;
		return (
			candidate.ccode === 40 &&
			typeof candidate.message === 'string' &&
			/'pipeline'.*missing or invalid/i.test(candidate.message)
		);
	});
	const echoedPipeline = current.pipeline as
		| { components?: unknown }
		| null
		| undefined;

	if (!rejectedAsMissingPipeline || echoedPipeline?.components !== null) {
		return { result: current, usedLegacyWrapper: false };
	}

	const legacy = (await client.validate({
		pipeline: { pipeline },
	})) as PipelineValidationResult;
	return { result: legacy, usedLegacyWrapper: true };
}
