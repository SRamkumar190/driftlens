/**
 * Mirrors drift_investigation.pipe into the repo-root new.pipe so the
 * RocketRide VS Code extension renders the graph in its main canvas tab.
 *
 * new.pipe keeps its OWN project_id: the docs require a unique GUID per .pipe
 * file, so the two files are the same graph under two identities. The canonical
 * file is drift_investigation.pipe — edit that one, then re-run this.
 *
 * Usage:
 *   npx tsx sync-canvas.ts          # write new.pipe from drift_investigation.pipe
 *   npx tsx sync-canvas.ts --check  # exit 1 if they have drifted apart
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CANONICAL = resolve(HERE, 'drift_investigation.pipe');
export const CANVAS = resolve(HERE, '../../new.pipe');

/** A stable GUID for new.pipe if it has none, so we never reuse the canonical one. */
const FALLBACK_CANVAS_GUID = 'e819b7cb-cce9-4790-bd2c-b35f9d7c1dbf';

function readJson(path: string): any {
	return JSON.parse(readFileSync(path, 'utf8'));
}

/** Build new.pipe's contents: canonical components, canvas file's own identity. */
export function buildCanvas(): { next: any; canvasGuid: string } {
	const canonical = readJson(CANONICAL);
	const existing = existsSync(CANVAS) ? readJson(CANVAS) : {};
	const canvasGuid: string = existing.project_id || FALLBACK_CANVAS_GUID;

	// components first, then project_id / viewport / version — field order matters.
	return {
		next: {
			components: canonical.components,
			project_id: canvasGuid,
			viewport: existing.viewport ?? canonical.viewport,
			version: canonical.version,
		},
		canvasGuid,
	};
}

function serialize(pipeline: any): string {
	return `${JSON.stringify(pipeline, null, '\t')}\n`;
}

function main() {
	const check = process.argv.includes('--check');
	const { next, canvasGuid } = buildCanvas();
	const serialized = serialize(next);

	if (check) {
		const current = existsSync(CANVAS) ? readFileSync(CANVAS, 'utf8') : '';
		const sameGraph =
			JSON.stringify(readJson(CANONICAL).components) ===
			JSON.stringify(existsSync(CANVAS) ? readJson(CANVAS).components ?? null : null);
		if (!sameGraph) {
			console.error('new.pipe has drifted from drift_investigation.pipe — run: npx tsx sync-canvas.ts');
			process.exit(1);
		}
		console.log(`new.pipe is in sync (${current.length} bytes, project_id=${canvasGuid})`);
		return;
	}

	writeFileSync(CANVAS, serialized, 'utf8');
	console.log(
		`Wrote ${CANVAS}\n  ${next.components.length} nodes, project_id=${canvasGuid} (canonical stays ${readJson(CANONICAL).project_id})`,
	);
}

// pathToFileURL, not string concat: on Windows a raw `file://C:/...` has two
// slashes where import.meta.url has three, so the comparison never matched.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
