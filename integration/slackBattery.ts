import type { ComponentResult } from './investigate.js';

interface HydraChunk {
  chunk_content?: string;
  source_title?: string;
  relevancy_score?: number;
  metadata?: { provider?: string };
  additional_metadata?: { app_provider?: string };
}

interface HydraQueryResponse {
  data?: { chunks?: HydraChunk[] };
}

export interface SlackBatteryOptions {
  apiKey?: string;
  database?: string;
  collection?: string;
  fetchImpl?: typeof fetch;
}

function providerOf(chunk: HydraChunk) {
  return chunk.metadata?.provider ?? chunk.additional_metadata?.app_provider;
}

function fieldFrom(messages: string[], field: string) {
  const pattern = new RegExp(
    `(?:^|[|\\n])\\s*${field}\\s*:\\s*([^|\\n]+)`,
    'i',
  );
  for (const message of messages) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function batteryResultFromHydraChunks(
  chunks: HydraChunk[],
): ComponentResult | null {
  const batteryChunks = chunks
    .filter((chunk) => providerOf(chunk) === 'slack')
    .filter((chunk) => /\bbattery_module_01\b/i.test(chunk.chunk_content ?? ''))
    .sort((a, b) => (b.relevancy_score ?? 0) - (a.relevancy_score ?? 0));

  if (batteryChunks.length === 0) return null;

  const messages = batteryChunks.map((chunk) => chunk.chunk_content ?? '');
  const before = fieldFrom(messages, 'BEFORE');
  const after = fieldFrom(messages, 'AFTER');
  const reason = fieldFrom(messages, 'REASON');
  const workflowStatus = fieldFrom(messages, 'STATUS');
  const valuesMatch = before !== null
    && after !== null
    && before.toLowerCase() === after.toLowerCase();
  const verificationPending = /pending|incomplete|todo|in progress/i.test(
    workflowStatus ?? '',
  );

  let status: ComponentResult['status'] = 'insufficient_evidence';
  if (valuesMatch) status = 'matches_design';
  else if (before && after && verificationPending) status = 'verification_incomplete';
  else if (before && after) status = 'unreviewed_drift';

  const conclusion = status === 'matches_design'
    ? 'The Battery Module value reported in Slack has not changed.'
    : status === 'verification_incomplete'
      ? 'Slack records a Battery Module change, but verification is still pending.'
      : status === 'unreviewed_drift'
        ? 'Slack records a Battery Module change without completed review evidence.'
        : 'Slack mentions the Battery Module, but both before and after values were not found.';

  const recommendedAction = status === 'matches_design'
    ? 'No drift action is required for the reported Battery Module value.'
    : status === 'verification_incomplete'
      ? 'Complete Battery Module verification before release review.'
      : status === 'unreviewed_drift'
        ? 'Open an engineering and quality review for the Battery Module change.'
        : 'Post both BEFORE and AFTER values using the DriftLens Slack format.';

  const slackSummary = [
    before ? `Before: ${before}.` : null,
    after ? `After: ${after}.` : null,
    reason ? `Reason: ${reason}.` : null,
    workflowStatus ? `Status: ${workflowStatus}.` : null,
  ].filter(Boolean).join(' ');

  return {
    component_id: 'battery_module_01',
    component_name: 'Battery Module',
    status,
    reviewed_value: before,
    implemented_value: after,
    confidence: before && after ? 0.88 : 0.55,
    drive_evidence: null,
    slack_evidence: slackSummary || messages[0].slice(0, 500),
    linear_evidence: null,
    github_evidence: null,
    conclusion,
    recommended_action: recommendedAction,
  };
}

export async function investigateSlackBattery({
  apiKey,
  database = 'love2agents',
  collection = 'all-hjkljk',
  fetchImpl = fetch,
}: SlackBatteryOptions = {}) {
  if (!apiKey) throw new Error('HYDRADB_API_KEY is not configured');

  const response = await fetchImpl('https://api.hydradb.com/query', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'API-Version': '2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      database,
      collection,
      query:
        'Latest Slack message for battery_module_01 with BEFORE AFTER REASON STATUS Battery Module change',
      type: 'all',
      query_by: 'hybrid',
      mode: 'fast',
      max_results: 20,
      graph_context: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`HydraDB returned HTTP ${response.status}`);
  }

  const payload = await response.json() as HydraQueryResponse;
  return batteryResultFromHydraChunks(payload.data?.chunks ?? []);
}
