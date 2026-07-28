/**
 * Loads .env without adding a dotenv dependency.
 *
 * Looks for .env next to this folder first, then at the repo root — the
 * RocketRide VS Code extension writes ROCKETRIDE_URI / ROCKETRIDE_APIKEY into
 * whichever workspace .env it manages, so we accept either location.
 * Existing process.env values always win.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const ENV_CANDIDATES = [
	resolve(HERE, '.env'),
	resolve(HERE, '../../.env'), // repo root
];

export function loadEnv(): string[] {
	const loaded: string[] = [];
	for (const path of ENV_CANDIDATES) {
		if (!existsSync(path)) continue;
		try {
			// Node >= 20.12 / 21.7. Does not overwrite existing process.env keys.
			process.loadEnvFile(path);
			loaded.push(path);
		} catch (error) {
			console.warn(`[env] could not load ${path}: ${(error as Error).message}`);
		}
	}
	return loaded;
}
