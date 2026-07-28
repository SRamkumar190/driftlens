import assert from 'node:assert/strict';
import { DEMO_COMPONENTS } from './fixtures.js';
import { liveProvidersConfigured, produceComponentResult } from './investigate.js';

console.log('DriftLens HydraDB / Pipeshift check\n');
for (const component of DEMO_COMPONENTS) {
	const result = await produceComponentResult(component.component_id, { mode: 'demo' });
	assert.equal(result.component_id, component.component_id);
	assert.equal(result.component_name, component.component_name);
	assert.ok(result.conclusion);
	assert.ok(result.recommended_action);
	assert.ok(result.confidence >= 0 && result.confidence <= 1);
	console.log(`  ok    ${component.component_id} -> ${result.status}`);
}
console.log(
	liveProvidersConfigured()
		? '\n  ok    live provider environment is configured'
		: '\n  info  live providers are not fully configured; auto mode uses the demo dataset',
);
