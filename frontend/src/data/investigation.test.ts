import { describe, expect, it } from 'vitest';
import {
  componentIdFromApi,
  mapInvestigationComponents,
  type InvestigateApiResponse,
} from './investigation';

const response: InvestigateApiResponse = {
  investigation_id: 'investigation-123',
  review_status: 'pending',
  response_source: 'rocketride',
  components: [
    {
      component_id: 'controller_01',
      component_name: 'Main Controller',
      status: 'unreviewed_drift',
      reviewed_value: '5 seconds',
      implemented_value: '7 seconds',
      confidence: 0.96,
      drive_evidence: 'Reviewed value is 5 seconds',
      slack_evidence: 'No discussion found',
      linear_evidence: 'No approved change found',
      github_evidence: 'MOTOR_TIMEOUT_SECONDS = 7',
      conclusion: 'Review evidence is incomplete.',
      recommended_action: 'Require human review.',
    },
    {
      component_id: 'occlusion_sensor_01',
      component_name: 'Occlusion Sensor',
      status: 'verification_incomplete',
      reviewed_value: '300 mmHg',
      implemented_value: '400 mmHg',
      confidence: 0.92,
      drive_evidence: 'Reviewed value is 300 mmHg',
      slack_evidence: 'False alarms were discussed',
      linear_evidence: 'Verification is incomplete',
      github_evidence: 'OCCLUSION_THRESHOLD_MMHG = 400',
      conclusion: 'Verification remains incomplete.',
      recommended_action: 'Complete verification.',
    },
  ],
};

describe('investigation response mapping', () => {
  it('maps backend component IDs to the existing 3D component IDs', () => {
    expect(componentIdFromApi('controller_01')).toBe('main-controller');
    expect(componentIdFromApi('occlusion_sensor_01')).toBe('occlusion-sensor');
    expect(componentIdFromApi('unknown')).toBeNull();
  });

  it('maps live values, statuses, confidence, and evidence', () => {
    const mapped = mapInvestigationComponents(response, 'all-sources');

    expect(mapped['main-controller']).toMatchObject({
      status: 'critical',
      approvedValue: '5 seconds',
      currentValue: '7 seconds',
      confidence: 96,
    });
    expect(mapped['occlusion-sensor']).toMatchObject({
      status: 'warning',
      approvedValue: '300 mmHg',
      currentValue: '400 mmHg',
      confidence: 92,
    });
    expect(mapped['main-controller']?.evidence.map((item) => item.source)).toEqual([
      'GitHub',
      'Drive',
      'Slack',
      'Linear',
    ]);
  });

  it('keeps only GitHub evidence in GitHub-only mode', () => {
    const githubResponse: InvestigateApiResponse = {
      ...response,
      components: response.components.map((component) => ({
        ...component,
        status: 'insufficient_evidence',
        reviewed_value: null,
        confidence: 0.19,
        drive_evidence: null,
        slack_evidence: null,
        linear_evidence: null,
        conclusion: 'The approved value, reason, and review status cannot be determined.',
      })),
    };

    const mapped = mapInvestigationComponents(githubResponse, 'github-only');

    expect(mapped['main-controller']).toMatchObject({
      status: 'unreviewed',
      approvedValue: 'Not available',
      currentValue: '7 seconds',
      confidence: 19,
      conclusion: 'The approved value, reason, and review status cannot be determined.',
    });
    expect(mapped['main-controller']?.evidence.map((item) => item.source)).toEqual(['GitHub']);
  });
});
