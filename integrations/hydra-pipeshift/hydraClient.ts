const SOURCES = ['drive', 'slack', 'linear', 'github'] as const;
export type EvidenceSource = (typeof SOURCES)[number];

export interface RetrievedEvidence {
	component_id: string;
	component_name: string;
	drive_evidence: string | null;
	slack_evidence: string | null;
	linear_evidence: string | null;
	github_evidence: string | null;
}

function firstText(value: unknown): string | null {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = firstText(item);
			if (found) return found;
		}
	}
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		for (const key of ['content', 'text', 'chunk_text', 'document', 'value', 'results', 'data']) {
			const found = firstText(record[key]);
			if (found) return found;
		}
	}
	return null;
}

async function recall(source: EvidenceSource, query: string): Promise<string | null> {
	const apiKey = process.env.HYDRADB_API_KEY?.trim();
	const tenantId = process.env.HYDRADB_TENANT_ID?.trim();
	if (!apiKey || !tenantId) {
		throw new Error('HydraDB requires HYDRADB_API_KEY and HYDRADB_TENANT_ID');
	}

	const response = await fetch('https://api.hydradb.com/recall/full_recall', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${apiKey}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			tenant_id: tenantId,
			query,
			max_results: 5,
			mode: 'fast',
			alpha: 0.5,
			recency_bias: 0.2,
			metadata: { source_type: source },
			additional_context:
				'Return evidence about reviewed design intent, implemented value, change rationale, assessment, or verification.',
		}),
	});

	if (!response.ok) {
		const detail = (await response.text()).slice(0, 500);
		throw new Error(`HydraDB ${source} recall failed (${response.status}): ${detail}`);
	}
	return firstText(await response.json());
}

export async function retrieveEvidence(
	componentId: string,
	componentName = componentId,
): Promise<RetrievedEvidence> {
	const query = `${componentName} (${componentId}) reviewed specification implementation change verification`;
	const entries = await Promise.all(
		SOURCES.map(async (source) => [source, await recall(source, query)] as const),
	);
	const evidence = Object.fromEntries(entries) as Record<EvidenceSource, string | null>;
	return {
		component_id: componentId,
		component_name: componentName,
		drive_evidence: evidence.drive,
		slack_evidence: evidence.slack,
		linear_evidence: evidence.linear,
		github_evidence: evidence.github,
	};
}
