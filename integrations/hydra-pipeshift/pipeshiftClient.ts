import {
	assertValidPayload,
	type InvestigationPayload,
} from '../rocketride-insforge/statusMap.js';
import type { RetrievedEvidence } from './hydraClient.js';

function endpoint(): string {
	const base = process.env.PIPESHIFT_BASE_URL?.trim();
	if (!base) throw new Error('PIPESHIFT_BASE_URL is required for live classification');
	return base.endsWith('/chat/completions')
		? base
		: `${base.replace(/\/+$/, '')}/v1/chat/completions`;
}

function parseJson(text: string): unknown {
	const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
	return JSON.parse(cleaned);
}

export async function classifyEvidence(
	evidence: RetrievedEvidence,
): Promise<InvestigationPayload> {
	const apiKey = process.env.PIPESHIFT_API_KEY?.trim();
	const model = process.env.PIPESHIFT_MODEL?.trim();
	if (!apiKey || !model) {
		throw new Error('Pipeshift requires PIPESHIFT_API_KEY and PIPESHIFT_MODEL');
	}

	const response = await fetch(endpoint(), {
		method: 'POST',
		headers: {
			authorization: `Bearer ${apiKey}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			model,
			temperature: 0,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content:
						'Classify medical-device design drift from supplied evidence. Do not determine safety, compliance, or fault. ' +
						'Return JSON only with component_id, component_name, status, reviewed_value, implemented_value, confidence, ' +
						'drive_evidence, slack_evidence, linear_evidence, github_evidence. Status must be exactly one of ' +
						'matches_design, verification_incomplete, unreviewed_drift, insufficient_evidence. Preserve evidence verbatim. ' +
						'Use null when a value cannot be supported. Confidence must be a number from 0 to 1.',
				},
				{ role: 'user', content: JSON.stringify(evidence) },
			],
		}),
	});

	if (!response.ok) {
		const detail = (await response.text()).slice(0, 500);
		throw new Error(`Pipeshift classification failed (${response.status}): ${detail}`);
	}
	const body = (await response.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
	};
	const content = body.choices?.[0]?.message?.content;
	if (!content) throw new Error('Pipeshift returned no classification content');

	const payload = parseJson(content) as InvestigationPayload;
	assertValidPayload(payload);
	if (payload.confidence < 0 || payload.confidence > 1) {
		throw new Error(`Pipeshift confidence must be between 0 and 1; received ${payload.confidence}`);
	}
	return payload;
}
