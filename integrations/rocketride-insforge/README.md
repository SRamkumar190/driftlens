# DriftLens RocketRide + InsForge

## Required environment variables

Server-side integration:

```text
ROCKETRIDE_HYDRADB_API_KEY=<HydraDB API key>
ROCKETRIDE_HYDRADB_DATABASE=<DriftLens HydraDB database ID>
ROCKETRIDE_OPENROUTER_API_KEY=<OpenRouter API key>
ROCKETRIDE_INSFORGE_URL=<InsForge project base URL>
ROCKETRIDE_INSFORGE_API_KEY=<InsForge server API key used by the media pipe>
ROCKETRIDE_INSFORGE_FUNCTION_SECRET=<same value as the Edge Function secret>
ROCKETRIDE_URI=https://api.rocketride.ai
ROCKETRIDE_AUTH=<RocketRide Cloud API token>
DRIFTLENS_FUNCTION_URL=<project base URL>/functions/save-investigation
DRIFTLENS_FUNCTION_SECRET=<long random shared secret>
```

Frontend (the anon key is intended for browser use):

```text
VITE_INSFORGE_URL=<InsForge project base URL>
VITE_INSFORGE_ANON_KEY=<InsForge anonymous key>
```

Keep both `*_FUNCTION_SECRET` values server-side. The frontend never receives
an admin API key or the function secret.

## Audio/video analysis

`driftlens-media-analysis.pipe` accepts one short audio or video upload,
transcribes it with RocketRide Whisper, retrieves current evidence from HydraDB,
applies the fixed drift rules in the Python tool, inserts the investigation in
InsForge, and returns `investigation_id` plus `component_result`.

The deployed source ID is `driftlens_media_webhook_v2`. Supply
`source_mode` and optional `component_id` as upload metadata; filename prefixes
such as `all_sources--occlusion_sensor_01--review.wav` are also accepted. The
reference recording text is in `test-media/sample-script.txt`.

The model node uses the linked InsForge project's server-side OpenRouter key.
Keep `ROCKETRIDE_OPENROUTER_API_KEY` and `ROCKETRIDE_INSFORGE_API_KEY` out of
frontend code.

## Intent profile

[`insforge/intent.md`](./insforge/intent.md) defines the
**DriftLens Medical Device Review** intent and its neutral, human-review rules.

## Create the database and storage

The migration adds the investigation workflow, authenticated RLS, review RPC,
realtime events, and evidence-file metadata:

```powershell
npx @insforge/cli migrations apply
npx @insforge/cli storage buckets create investigation-evidence --private
```

[`insforge/schema.sql`](./insforge/schema.sql) documents the base investigation
table. [`../../migrations/20260728213818_driftlens-workflow.sql`](../../migrations/20260728213818_driftlens-workflow.sql)
contains the applied workflow migration.

Deploy the write function:

```powershell
npx @insforge/cli secrets add DRIFTLENS_FUNCTION_SECRET <secret>
npx @insforge/cli secrets add DRIFTLENS_REVIEW_EMAIL <reviewer-email>
npx @insforge/cli functions deploy save-investigation `
  --file .\integrations\rocketride-insforge\insforge\functions\save-investigation.ts
```

## Save an investigation

After both component branches finish, RocketRide applies the fixed rules and
posts the complete response to:

```text
${ROCKETRIDE_INSFORGE_URL}/functions/save-investigation
```

The function validates `X-DriftLens-Secret`, stores the complete component
array in `components_json`, forces `review_status = pending`, sends the reviewer
email, and returns the generated ID. The local `/api/investigate` adapter uses
the same function when it must serve the deterministic demo fallback.

The reusable server caller is
[`insforge/save-investigation.ts`](./insforge/save-investigation.ts).

Authenticated reviewers can:

- read the five most recent investigations;
- mark the current investigation reviewed through `review_investigation`;
- attach private evidence files under their own storage prefix;
- receive realtime `investigation_saved` and `review_status_changed` events.

### Example request

```json
{
  "source_mode": "all_sources",
  "response_source": "rocketride",
  "components": [
    {
      "component_id": "controller_01",
      "component_name": "Main Controller",
      "status": "unreviewed_drift",
      "reviewed_value": "5 seconds",
      "implemented_value": "7 seconds",
      "confidence": 0.96
    }
  ]
}
```

### Example response

```json
{
  "investigation_id": "97b10df7-c19f-4245-8c1f-a3b8c119ab38",
  "review_status": "pending"
}
```

The complete flow is:

```text
HydraDB -> RocketRide analysis -> InsForge saves result -> frontend receives result
```

No scheduled check is configured.
