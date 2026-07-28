import { describe, expect, it } from 'vitest';

import { components, componentOrder, githubOnlyConclusion } from './components';

describe('DriftLens component data', () => {
  it('provides the five reviewable device components in navigation order', () => {
    expect(componentOrder).toEqual([
      'main-controller',
      'flow-sensor',
      'pump-motor',
      'occlusion-sensor',
      'battery-module',
    ]);
    expect(new Set(Object.keys(components))).toEqual(new Set(componentOrder));
  });

  it('preserves the Main Controller drift values', () => {
    expect(components['main-controller']).toMatchObject({
      name: 'Main Controller',
      currentValue: '7 seconds',
      approvedValue: '5 seconds',
      confidence: 96,
      status: 'critical',
    });
    expect(components['main-controller'].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'GitHub',
          summary: 'MOTOR_TIMEOUT_SECONDS = 7',
        }),
        expect.objectContaining({
          source: 'Drive',
          summary: 'Reviewed motor timeout is 5 seconds',
        }),
        expect.objectContaining({ source: 'Slack', summary: 'No matching discussion found' }),
        expect.objectContaining({ source: 'Linear', summary: 'No change request found' }),
      ]),
    );
  });

  it('preserves the Occlusion Sensor review values', () => {
    expect(components['occlusion-sensor']).toMatchObject({
      name: 'Occlusion Sensor',
      currentValue: '400 mmHg',
      approvedValue: '300 mmHg',
      confidence: 92,
      status: 'warning',
    });
    expect(components['occlusion-sensor'].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'Drive',
          summary: 'Reviewed specification requires 300 mmHg',
        }),
        expect.objectContaining({
          source: 'Slack',
          summary: 'Engineers discussed false alarms during testing',
        }),
        expect.objectContaining({
          source: 'Linear',
          summary: 'Change assessment completed',
        }),
        expect.objectContaining({ source: 'Verification', summary: 'No completed verification task' }),
      ]),
    );
  });

  it('uses the supplied indeterminate conclusion for GitHub-only review', () => {
    expect(githubOnlyConclusion).toBe(
      'The current value is visible, but the approved value, rationale, and review status cannot be determined.',
    );
  });
});
