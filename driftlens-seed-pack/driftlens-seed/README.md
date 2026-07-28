# DriftLens Seed Pack

Use these files to seed the four data sources (or ingest directly into HydraDB via
`integrations/hydra-pipeshift/ingest_seed.py`).

## Google Drive
Upload everything under `google-drive/`:
- approved Rev B spec
- historical Rev A spec
- design review minutes
- risk analysis excerpt
- verification protocols
- bench telemetry + release evidence matrix

## Slack
Create channels:
- `med-device-validation`
- `firmware-debug`
- `product-qa`
- `release-readiness`

Import:
- `slack/slack_messages.csv`
- `slack/slack_threads_extended.csv`

## Linear
Create issues/comments from:
- `linear/linear_issues.csv`
- `linear/linear_comments.csv`
- `linear/linear_changelog.md`

## GitHub
Add:
- `github/src/config/deviceConfig.ts`
- `github/src/config/alarmConstants.ts`
- `github/COMMITS.md`
- `github/CODE_REVIEW_COMMENTS.md`
- `github/pull-requests/*`
- `github/README.md`

## Expected result
- `occlusion_sensor_01` => yellow / verification incomplete
- `controller_01` => red / unreviewed drift

Every source contains matching component IDs so HydraDB can correlate them reliably.
