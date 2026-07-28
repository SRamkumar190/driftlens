import { describe, expect, it, vi } from 'vitest';
import {
  batteryResultFromHydraChunks,
  investigateSlackBattery,
} from '../../integration/slackBattery';

const batteryMessage = [
  '[battery_module_01]',
  'BEFORE: Pack revision B',
  'AFTER: Pack revision C',
  'REASON: cold-weather capacity update',
  'STATUS: verification_pending',
].join(' | ');

describe('Slack Battery Module integration', () => {
  it('maps a structured Slack message to a yellow Battery Module result', () => {
    const result = batteryResultFromHydraChunks([
      {
        chunk_content: batteryMessage,
        relevancy_score: 0.98,
        metadata: { provider: 'slack' },
      },
    ]);

    expect(result).toMatchObject({
      component_id: 'battery_module_01',
      status: 'verification_incomplete',
      reviewed_value: 'Pack revision B',
      implemented_value: 'Pack revision C',
      confidence: 0.88,
      drive_evidence: null,
      linear_evidence: null,
      github_evidence: null,
    });
    expect(result?.slack_evidence).toContain('cold-weather capacity update');
  });

  it('queries the connected HydraDB Slack collection', async () => {
    const fetchImpl = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          chunks: [{
            chunk_content: batteryMessage,
            metadata: { provider: 'slack' },
          }],
        },
      }),
    }) as Response);

    const result = await investigateSlackBattery({
      apiKey: 'server-only-key',
      database: 'love2agents',
      collection: 'all-hjkljk',
      fetchImpl,
    });

    expect(result?.component_id).toBe('battery_module_01');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      database: 'love2agents',
      collection: 'all-hjkljk',
    });
  });
});
