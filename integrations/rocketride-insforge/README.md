# DriftLens RocketRide Cloud pipeline

## Required environment variables

Set these variables in the RocketRide Cloud project that runs the pipeline:

```text
HYDRA_DB_API_KEY=<HydraDB API key>
ROCKETRIDE_HYDRADB_DATABASE=<DriftLens HydraDB database ID>
ROCKETRIDE_OPENAI_KEY=<OpenAI API key>
ROCKETRIDE_URI=https://api.rocketride.ai
ROCKETRIDE_AUTH=<RocketRide Cloud API token>
```

`ROCKETRIDE_APIKEY` is accepted by the RocketRide CLI in place of
`ROCKETRIDE_AUTH`.

## HydraDB fields

The `hydradb_driftlens` node uses:

```text
database: ${ROCKETRIDE_HYDRADB_DATABASE}
collection: Ali_amjad
max_results: 20
```

The API key field is intentionally blank so the HydraDB node reads
`HYDRA_DB_API_KEY` from the Cloud environment.

## Deploy

Install the RocketRide CLI and start the long-lived webhook pipeline against
Cloud:

```powershell
python -m pip install rocketride
$env:ROCKETRIDE_URI = "https://api.rocketride.ai"
$env:ROCKETRIDE_APIKEY = $env:ROCKETRIDE_AUTH
rocketride start .\driftlens-analysis.pipe
```

Keep the task token printed by `rocketride start`. The pipeline remains deployed
as that running Cloud task.

## Webhook URL

In RocketRide Cloud, open the running task, select the `driftlens_webhook`
source node, and copy its Webhook URL. The same location shows the task token
used by the CLI and SDK.

## Test payloads

Post each JSON file to the Webhook URL:

```powershell
Invoke-RestMethod -Method Post -Uri $env:DRIFTLENS_WEBHOOK_URL `
  -ContentType "application/json" `
  -InFile .\test-payloads\all-sources.json

Invoke-RestMethod -Method Post -Uri $env:DRIFTLENS_WEBHOOK_URL `
  -ContentType "application/json" `
  -InFile .\test-payloads\github-only.json
```

The all-sources payload should produce a red `unreviewed_drift` result for
`controller_01` (confidence about `0.96`) and a yellow
`verification_incomplete` result for `occlusion_sensor_01` (confidence about
`0.92`). The GitHub-only payload is deliberately degraded: reviewed values and
Drive, Slack, and Linear evidence are `null`; both results are
`insufficient_evidence` with confidence `0.19`.

