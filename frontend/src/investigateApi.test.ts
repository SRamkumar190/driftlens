import { describe, expect, it, vi } from 'vitest';
import { investigate } from '../../integration/investigate';

describe('/api/investigate handler', () => {
  it('returns the complete deterministic demo state without a webhook', async () => {
    const result = await investigate({ source_mode: 'all_sources' });

    expect(result.response_source).toBe('demo_fallback');
    expect(result.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component_id: 'controller_01',
          reviewed_value: '5 seconds',
          implemented_value: '7 seconds',
          status: 'unreviewed_drift',
          confidence: 0.96,
        }),
        expect.objectContaining({
          component_id: 'occlusion_sensor_01',
          reviewed_value: '300 mmHg',
          implemented_value: '400 mmHg',
          status: 'verification_incomplete',
          confidence: 0.92,
        }),
      ]),
    );
  });

  it('makes GitHub-only evidence deliberately insufficient', async () => {
    const result = await investigate({ source_mode: 'github_only' });

    result.components.forEach((component) => {
      expect(component).toMatchObject({
        status: 'insufficient_evidence',
        reviewed_value: null,
        confidence: 0.19,
        drive_evidence: null,
        slack_evidence: null,
        linear_evidence: null,
        conclusion: 'The approved value, reason, and review status cannot be determined.',
      });
      expect(component.github_evidence).toBeTruthy();
    });
  });

  it('stores fallback analysis through the InsForge function', async () => {
    const fetchImpl = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => ({
      ok: true,
      status: 201,
      json: async () => ({
        investigation_id: 'saved-123',
        review_status: 'pending',
      }),
    }) as Response);

    const result = await investigate(
      { source_mode: 'all_sources' },
      {
        functionUrl: 'https://insforge.example/functions/save-investigation',
        functionSecret: 'server-only-secret',
        fetchImpl,
      },
    );

    expect(result.investigation_id).toBe('saved-123');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      source_mode: 'all_sources',
      response_source: 'demo_fallback',
    });
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      'X-DriftLens-Secret': 'server-only-secret',
    });
  });

  it('forwards the unchanged request contract to RocketRide', async () => {
    const fetchImpl = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => ({
      ok: true,
      status: 200,
      json: async () => ({
        investigation_id: 'live-123',
        components: [
          {
            component_id: 'controller_01',
            component_name: 'Main Controller',
            status: 'unreviewed_drift',
            reviewed_value: '5 seconds',
            implemented_value: '7 seconds',
            confidence: 0.96,
            drive_evidence: 'Drive',
            slack_evidence: 'Slack',
            linear_evidence: 'Linear',
            github_evidence: 'GitHub',
            conclusion: 'Conclusion',
            recommended_action: 'Review',
          },
        ],
      }),
    }) as Response);

    const result = await investigate(
      {
        source_mode: 'all_sources',
        component_ids: ['controller_01', 'occlusion_sensor_01'],
      },
      {
        webhookUrl: 'https://rocketride.example/webhook',
        webhookAuth: 'public-webhook-key',
        fetchImpl,
        allowDemoFallback: false,
      },
    );

    expect(result).toMatchObject({
      investigation_id: 'live-123',
      response_source: 'rocketride',
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({
      source_mode: 'all_sources',
      component_ids: ['controller_01', 'occlusion_sensor_01'],
    });
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'public-webhook-key',
    });
  });
});
