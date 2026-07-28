export type ApiSourceMode = 'all_sources' | 'github_only';

export interface InvestigateRequest {
  source_mode: ApiSourceMode;
  component_ids?: string[];
}

export interface ComponentResult {
  component_id: string;
  component_name: string;
  status:
    | 'matches_design'
    | 'verification_incomplete'
    | 'unreviewed_drift'
    | 'insufficient_evidence';
  reviewed_value: string | null;
  implemented_value: string | null;
  confidence: number;
  drive_evidence: string | null;
  slack_evidence: string | null;
  linear_evidence: string | null;
  github_evidence: string | null;
  conclusion: string;
  recommended_action: string;
}

export interface InvestigateResponse {
  investigation_id: string;
  review_status: 'pending';
  components: ComponentResult[];
  response_source: 'rocketride' | 'demo_fallback';
}

interface InvestigateOptions {
  webhookUrl?: string;
  webhookAuth?: string;
  functionUrl?: string;
  functionSecret?: string;
  fetchImpl?: typeof fetch;
  allowDemoFallback?: boolean;
}

const githubOnlyConclusion =
  'The approved value, reason, and review status cannot be determined.';

const allSourcesComponents: ComponentResult[] = [
  {
    component_id: 'controller_01',
    component_name: 'Main Controller',
    status: 'unreviewed_drift',
    reviewed_value: '5 seconds',
    implemented_value: '7 seconds',
    confidence: 0.96,
    drive_evidence: 'Reviewed motor timeout is 5 seconds.',
    slack_evidence: 'No matching engineering discussion was found.',
    linear_evidence: 'No approved change request was found.',
    github_evidence: 'MOTOR_TIMEOUT_SECONDS = 7',
    conclusion:
      'The motor timeout differs from the reviewed value, and complete review evidence was not found.',
    recommended_action: 'Require human engineering and quality review before release.',
  },
  {
    component_id: 'occlusion_sensor_01',
    component_name: 'Occlusion Sensor',
    status: 'verification_incomplete',
    reviewed_value: '300 mmHg',
    implemented_value: '400 mmHg',
    confidence: 0.92,
    drive_evidence: 'Reviewed occlusion threshold is 300 mmHg.',
    slack_evidence: 'Engineers discussed false alarms during bench testing.',
    linear_evidence: 'The change assessment is complete, but verification is not.',
    github_evidence: 'OCCLUSION_THRESHOLD_MMHG = 400',
    conclusion:
      'The threshold differs from the reviewed specification; assessment exists, but verification is incomplete.',
    recommended_action: 'Require human engineering and quality review and complete verification.',
  },
];

function cloneComponents(components: ComponentResult[]) {
  return components.map((component) => ({ ...component }));
}

function githubOnlyComponents() {
  return allSourcesComponents.map((component): ComponentResult => ({
    ...component,
    status: 'insufficient_evidence',
    reviewed_value: null,
    confidence: 0.19,
    drive_evidence: null,
    slack_evidence: null,
    linear_evidence: null,
    conclusion: githubOnlyConclusion,
    recommended_action:
      'Collect the approved specification, rationale, and review evidence for human review.',
  }));
}

function demoResponse(sourceMode: ApiSourceMode): InvestigateResponse {
  return {
    investigation_id: `demo-${sourceMode}`,
    review_status: 'pending',
    components:
      sourceMode === 'github_only'
        ? githubOnlyComponents()
        : cloneComponents(allSourcesComponents),
    response_source: 'demo_fallback',
  };
}

async function saveInvestigation(
  result: InvestigateResponse,
  sourceMode: ApiSourceMode,
  functionUrl: string | undefined,
  functionSecret: string | undefined,
  fetchImpl: typeof fetch,
): Promise<InvestigateResponse> {
  if (!functionUrl || !functionSecret) return result;

  const response = await fetchImpl(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DriftLens-Secret': functionSecret,
    },
    body: JSON.stringify({
      source_mode: sourceMode,
      components: result.components,
      response_source: result.response_source,
    }),
  });

  if (!response.ok) {
    throw new Error(`InsForge save returned HTTP ${response.status}`);
  }

  const saved = await response.json() as {
    investigation_id?: string;
    review_status?: 'pending';
  };
  if (!saved.investigation_id) {
    throw new Error('InsForge save did not return an investigation ID');
  }

  return {
    ...result,
    investigation_id: saved.investigation_id,
    review_status: saved.review_status ?? 'pending',
  };
}

function parsePossiblyEncodedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return parsePossiblyEncodedJson(JSON.parse(value));
  } catch {
    return value;
  }
}

function unwrapRocketRideResponse(payload: unknown): Record<string, unknown> {
  let current = parsePossiblyEncodedJson(payload);

  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(current)) return { components: current };
    if (!current || typeof current !== 'object') break;

    const record = current as Record<string, unknown>;
    const directComponents = parsePossiblyEncodedJson(record.components);
    if (Array.isArray(directComponents)) {
      return {
        ...record,
        components: directComponents,
      };
    }
    if (
      directComponents
      && typeof directComponents === 'object'
      && !Array.isArray(directComponents)
      && Array.isArray((directComponents as Record<string, unknown>).components)
    ) {
      return directComponents as Record<string, unknown>;
    }

    const nested = record.result ?? record.data ?? record.answer ?? record.output;
    if (nested === undefined) break;
    current = parsePossiblyEncodedJson(nested);
  }

  throw new Error('RocketRide response did not contain a components array');
}

function isComponentResult(value: unknown): value is ComponentResult {
  if (!value || typeof value !== 'object') return false;
  const component = value as Partial<ComponentResult>;
  return (
    typeof component.component_id === 'string'
    && typeof component.component_name === 'string'
    && typeof component.status === 'string'
    && typeof component.confidence === 'number'
  );
}

function normalizeRocketRideResponse(
  payload: unknown,
  sourceMode: ApiSourceMode,
): InvestigateResponse {
  const unwrapped = unwrapRocketRideResponse(payload);
  const rawComponents = unwrapped.components;

  if (!Array.isArray(rawComponents) || !rawComponents.every(isComponentResult)) {
    throw new Error('RocketRide returned an invalid component contract');
  }

  const components = rawComponents.map((component) => {
    if (sourceMode !== 'github_only') return component;
    return {
      ...component,
      status: 'insufficient_evidence' as const,
      reviewed_value: null,
      confidence: 0.19,
      drive_evidence: null,
      slack_evidence: null,
      linear_evidence: null,
      conclusion: githubOnlyConclusion,
    };
  });

  return {
    investigation_id:
      typeof unwrapped.investigation_id === 'string'
        ? unwrapped.investigation_id
        : 'rocketride-investigation',
    review_status: 'pending',
    components,
    response_source: 'rocketride',
  };
}

export async function investigate(
  request: InvestigateRequest,
  {
    webhookUrl,
    webhookAuth,
    functionUrl,
    functionSecret,
    fetchImpl = fetch,
    allowDemoFallback = true,
  }: InvestigateOptions = {},
): Promise<InvestigateResponse> {
  if (request.source_mode !== 'all_sources' && request.source_mode !== 'github_only') {
    throw new Error('source_mode must be all_sources or github_only');
  }

  const payload = {
    source_mode: request.source_mode,
    component_ids: request.component_ids ?? ['controller_01', 'occlusion_sensor_01'],
  };

  if (!webhookUrl) {
    if (allowDemoFallback) {
      return saveInvestigation(
        demoResponse(request.source_mode),
        request.source_mode,
        functionUrl,
        functionSecret,
        fetchImpl,
      );
    }
    throw new Error('ROCKETRIDE_WEBHOOK_URL is not configured');
  }

  try {
    // RocketRide webhook maps text/plain onto the text→question lane.
    // application/json lands on the json lane and never reaches the agent.
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...(webhookAuth ? { Authorization: webhookAuth } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(allowDemoFallback ? 5_000 : 120_000),
    });

    if (!response.ok) throw new Error(`RocketRide returned HTTP ${response.status}`);
    const live = normalizeRocketRideResponse(await response.json(), request.source_mode);
    // Persist via InsForge when configured; RocketRide pipe returns components only.
    return saveInvestigation(
      live,
      request.source_mode,
      functionUrl,
      functionSecret,
      fetchImpl,
    );
  } catch (error) {
    if (allowDemoFallback) {
      return saveInvestigation(
        demoResponse(request.source_mode),
        request.source_mode,
        functionUrl,
        functionSecret,
        fetchImpl,
      );
    }
    throw error;
  }
}

export const demoInvestigation = {
  allSources: () => demoResponse('all_sources'),
  githubOnly: () => demoResponse('github_only'),
};
