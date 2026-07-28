export interface SaveInvestigationInput {
  source_mode: 'all_sources' | 'github_only';
  components: unknown[];
  response_source?: 'rocketride' | 'demo_fallback';
}

export interface SaveInvestigationResult {
  investigation_id: string;
  review_status: 'pending';
}

/**
 * Calls the deployed InsForge Edge Function from trusted server-side code.
 * Never expose DRIFTLENS_FUNCTION_SECRET to browser code.
 */
export async function saveInvestigation(
  input: SaveInvestigationInput,
): Promise<SaveInvestigationResult> {
  const functionUrl = process.env.DRIFTLENS_FUNCTION_URL;
  const functionSecret = process.env.DRIFTLENS_FUNCTION_SECRET;
  if (!functionUrl || !functionSecret) {
    throw new Error(
      'DRIFTLENS_FUNCTION_URL and DRIFTLENS_FUNCTION_SECRET are required',
    );
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DriftLens-Secret': functionSecret,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`InsForge save failed with HTTP ${response.status}`);
  }

  const saved = await response.json() as Partial<SaveInvestigationResult>;
  if (!saved.investigation_id || saved.review_status !== 'pending') {
    throw new Error('InsForge returned an invalid investigation response');
  }

  return saved as SaveInvestigationResult;
}
