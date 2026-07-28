import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { ComponentResult } from '../shared/types.js';
import { produceComponentResult, type ProviderMode } from '../integrations/hydra-pipeshift/investigate.js';
import { investigate as runRocketRide } from '../integrations/rocketride-insforge/investigate.js';

const PORT = Number(process.env.PORT ?? 8787);

function send(response: ServerResponse, status: number, body: unknown) {
	response.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
		'access-control-allow-headers': 'content-type',
		'access-control-allow-methods': 'POST, OPTIONS',
	});
	response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export async function investigateComponent(
	componentId: string,
	options: { componentName?: string; providerMode?: ProviderMode } = {},
): Promise<{ result: ComponentResult; rocketride: 'completed' | 'fallback' | 'off'; warning?: string }> {
	const produced = await produceComponentResult(componentId, {
		componentName: options.componentName,
		mode: options.providerMode,
	});
	const rocketrideMode = process.env.DRIFTLENS_ROCKETRIDE_MODE ?? 'preferred';
	if (rocketrideMode === 'off') return { result: produced, rocketride: 'off' };

	try {
		const result = await runRocketRide(produced);
		return { result, rocketride: 'completed' };
	} catch (error) {
		if (rocketrideMode === 'required') throw error;
		return {
			result: produced,
			rocketride: 'fallback',
			warning: `RocketRide unavailable; canonical deterministic mapping retained: ${(error as Error).message}`,
		};
	}
}

export function createDriftLensServer() {
	return createServer(async (request, response) => {
		if (request.method === 'OPTIONS') return send(response, 204, null);
		if (request.method === 'GET' && request.url === '/health') {
			return send(response, 200, { ok: true, service: 'driftlens' });
		}
		if (request.method !== 'POST' || request.url !== '/api/investigate') {
			return send(response, 404, { error: 'not_found' });
		}
		try {
			const body = await readJson(request);
			const componentId = body.component_id;
			if (typeof componentId !== 'string' || !componentId.trim()) {
				return send(response, 400, { error: 'component_id_required' });
			}
			const providerMode =
				body.mode === 'live' || body.mode === 'demo' || body.mode === 'auto'
					? body.mode
					: 'auto';
			const output = await investigateComponent(componentId, {
				componentName:
					typeof body.component_name === 'string' ? body.component_name : undefined,
				providerMode,
			});
			return send(response, 200, output);
		} catch (error) {
			return send(response, 500, {
				error: 'investigation_failed',
				message: (error as Error).message,
			});
		}
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	createDriftLensServer().listen(PORT, () => {
		console.log(`DriftLens API listening on http://localhost:${PORT}`);
	});
}
