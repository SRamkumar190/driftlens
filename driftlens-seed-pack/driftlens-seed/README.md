# DriftLens Seed Pack

Use these files to seed the four data sources.

## Google Drive
Upload:
- `google-drive/Infusion_Pump_Rev_B_Approved_Spec.md`

## Slack
Create channels:
- `med-device-validation`
- `firmware-debug`

Copy each row from:
- `slack/slack_messages.csv`

## Linear
Create the three issues from:
- `linear/linear_issues.csv`

## GitHub
Add:
- `github/src/config/deviceConfig.ts`
- `github/COMMITS.md`

## Expected result
- `occlusion_sensor_01` => yellow / verification incomplete
- `controller_01` => red / unreviewed drift

Every source contains matching component IDs so HydraDB can correlate them reliably.
