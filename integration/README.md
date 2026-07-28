# DriftLens full-system integration

The frontend calls `POST /api/investigate`. During local development and
preview, the Vite middleware delegates to `integration/investigate.ts`, which:

1. forwards the unchanged request to `ROCKETRIDE_WEBHOOK_URL` when configured;
2. receives Person 3's RocketRide response after HydraDB analysis and InsForge
   persistence;
3. normalizes the response envelope without changing `ComponentResult`;
4. returns the component array to the frontend.

If the webhook is missing or unavailable, the endpoint uses the same
deterministic two-component demo response. Set `DRIFTLENS_DEMO_FALLBACK=false`
to require the live RocketRide path.

## Run the complete demo

From the repository root:

```powershell
npm --prefix frontend install
$env:ROCKETRIDE_WEBHOOK_URL = "<RocketRide driftlens_webhook URL>"
npm --prefix frontend run dev
```

Open the printed local URL and choose **Launch Demo**. The demo fallback requires
no environment variables:

```powershell
npm --prefix frontend run dev
```

## API request

```json
{
  "source_mode": "all_sources",
  "component_ids": ["controller_01", "occlusion_sensor_01"]
}
```

Use `"github_only"` for the kill-shot state.

## Validate

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

## 90-second live demo

- **0–15 seconds:** Open the review workspace. Point out that every device part
  is gray before analysis.
- **15–30 seconds:** Click **Run Drift Analysis**. Explain the flow:
  HydraDB → RocketRide → InsForge → `/api/investigate` → frontend.
- **30–50 seconds:** Show the red Main Controller and yellow Occlusion Sensor.
  Click Main Controller and call out 5 seconds reviewed, 7 seconds current, and
  96% confidence.
- **50–65 seconds:** Click Occlusion Sensor and call out 300 mmHg reviewed,
  400 mmHg current, and 92% confidence with incomplete verification.
- **65–85 seconds:** Select **GitHub Only**. The endpoint reruns automatically.
  Click Main Controller: Drive, Slack, and Linear are gone; only the current
  GitHub value remains; confidence is 19%; the conclusion says the approved
  value, reason, and review status cannot be determined.
- **85–90 seconds:** Close with: DriftLens does not decide safety or compliance;
  it shows where human engineering and quality review is required.
