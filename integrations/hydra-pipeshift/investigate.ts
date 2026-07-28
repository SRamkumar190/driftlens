import { pathToFileURL } from 'node:url';
import type { ComponentResult } from '../../shared/types.js';
import { loadEnv } from '../rocketride-insforge/loadEnv.js';
import { reconcile, type InvestigationPayload } from '../rocketride-insforge/statusMap.js';
import { findDemoComponent } from './fixtures.js';
import { retrieveEvidence } from './hydraClient.js';
import { classifyEvidence } from './pipeshiftClient.js';

loadEnv();

export type ProviderMode = 'auto' | 'demo' | 'live';

export interface ProducerOptions {
	componentName?: string;
	mode?: ProviderMode;
}

export function liveProvidersConfigured(): boolean {
	return Boolean(
		process.env.HYDRADB_API_KEY?.trim() &&
			process.env.HYDRADB_TENANT_ID?.trim() &&
			process.env.PIPESHIFT_API_KEY?.trim() &&
			process.env.PIPESHIFT_BASE_URL?.trim() &&
			process.env.PIPESHIFT_MODEL?.trim(),
	);
}

export async function produceComponentResult(
	componentIdOrName: string,
	options: ProducerOptions = {},
): Promise<ComponentResult> {
	const mode = options.mode ?? 'auto';
	const useLive = mode === 'live' || (mode === 'auto' && liveProvidersConfigured());

	let payload: InvestigationPayload;
	if (useLive) {
		const evidence = await retrieveEvidence(
			componentIdOrName,
			options.componentName ?? componentIdOrName,
		);
		payload = await classifyEvidence(evidence);
	} else {
		const fixture = findDemoComponent(componentIdOrName);
		if (!fixture) {
			throw new Error(
				`Unknown demo component ${JSON.stringify(componentIdOrName)}. ` +
					'Use flow_controller_01, occlusion_sensor_01, controller_01, or battery_monitor_01.',
			);
		}
		payload = {
			component_id: fixture.component_id,
			component_name: fixture.component_name,
			status: fixture.status,
			reviewed_value: fixture.reviewed_value,
			implemented_value: fixture.implemented_value,
			confidence: fixture.confidence,
			drive_evidence: fixture.drive_evidence,
			slack_evidence: fixture.slack_evidence,
			linear_evidence: fixture.linear_evidence,
			github_evidence: fixture.github_evidence,
		};
	}

	return reconcile(payload).result;
}

async function main() {
	const args = process.argv.slice(2);
	const mode = args.includes('--live') ? 'live' : args.includes('--demo') ? 'demo' : 'auto';
	const component = args.find((arg) => !arg.startsWith('--')) ?? 'occlusion_sensor_01';
	console.log(JSON.stringify(await produceComponentResult(component, { mode }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
