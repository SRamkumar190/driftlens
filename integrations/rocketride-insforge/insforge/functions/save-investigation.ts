import { createAdminClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-DriftLens-Secret',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

type SourceMode = 'all_sources' | 'github_only';
type ResponseSource = 'rocketride' | 'demo_fallback';

interface SaveInvestigationRequest {
  source_mode: SourceMode;
  components: unknown[];
  response_source?: ResponseSource;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function isSaveRequest(value: unknown): value is SaveInvestigationRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Partial<SaveInvestigationRequest>;
  return (
    (request.source_mode === 'all_sources'
      || request.source_mode === 'github_only')
    && Array.isArray(request.components)
    && request.components.length > 0
    && (
      request.response_source === undefined
      || request.response_source === 'rocketride'
      || request.response_source === 'demo_fallback'
    )
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default async function saveInvestigation(
  request: Request,
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const expectedSecret = Deno.env.get('DRIFTLENS_FUNCTION_SECRET');
  const providedSecret = request.headers.get('X-DriftLens-Secret');

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }

  if (!isSaveRequest(payload)) {
    return json({
      error:
        'source_mode and a non-empty components array are required',
    }, 400);
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const apiKey = Deno.env.get('API_KEY');
  if (!baseUrl || !apiKey) {
    return json({ error: 'InsForge function environment is incomplete' }, 500);
  }

  const admin = createAdminClient({ baseUrl, apiKey });
  const responseSource = payload.response_source ?? 'rocketride';

  const { data, error } = await admin.database
    .from('investigations')
    .insert([{
      source_mode: payload.source_mode,
      components_json: payload.components,
      review_status: 'pending',
      response_source: responseSource,
    }])
    .select('id, review_status, created_at')
    .single();

  if (error || !data?.id) {
    return json({
      error: error?.message ?? 'Investigation insert failed',
    }, 500);
  }

  const recipient = Deno.env.get('DRIFTLENS_REVIEW_EMAIL');
  let notification: 'sent' | 'not_configured' | 'failed' = 'not_configured';

  if (recipient) {
    const componentCount = payload.components.length;
    const emailResult = await admin.emails.send({
      to: recipient,
      subject: `DriftLens investigation ready: ${data.id}`,
      from: 'DriftLens Reviews',
      html: [
        '<h1>Drift analysis ready for review</h1>',
        `<p>Investigation <strong>${escapeHtml(data.id)}</strong> contains `,
        `${componentCount} component${componentCount === 1 ? '' : 's'}.</p>`,
        `<p>Source mode: ${escapeHtml(payload.source_mode)}</p>`,
        '<p>Status: pending human engineering and quality review.</p>',
      ].join(''),
    });
    notification = emailResult.error ? 'failed' : 'sent';
  }

  return json({
    investigation_id: data.id,
    review_status: data.review_status,
    created_at: data.created_at,
    notification,
  }, 201);
}
