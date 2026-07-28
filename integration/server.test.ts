import assert from 'node:assert/strict';
import test from 'node:test';
import { investigateComponent } from './server.js';

test('orchestrates the shared contract without external services in demo mode', async () => {
	const previous = process.env.DRIFTLENS_ROCKETRIDE_MODE;
	process.env.DRIFTLENS_ROCKETRIDE_MODE = 'off';
	try {
		const output = await investigateComponent('controller_01', {
			providerMode: 'demo',
		});
		assert.equal(output.rocketride, 'off');
		assert.equal(output.result.component_name, 'Motor Controller');
		assert.equal(output.result.status, 'unreviewed_drift');
		assert.equal(
			output.result.conclusion,
			'Implementation changed without complete review evidence.',
		);
	} finally {
		if (previous === undefined) delete process.env.DRIFTLENS_ROCKETRIDE_MODE;
		else process.env.DRIFTLENS_ROCKETRIDE_MODE = previous;
	}
});
