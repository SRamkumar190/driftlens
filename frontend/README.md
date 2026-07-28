# DriftLens frontend

React and React Three Fiber interface for reviewing medical-device design drift.

The frontend provides:

- A judge-focused landing page at `/`
- An interactive medical-device review workspace at `/review`
- Component selection, camera focus, and evidence review
- Live `/api/investigate` results with a deterministic demo fallback
- All Sources investigation mode in the current UI
- Live Battery Module before/after retrieval from connected Slack evidence in HydraDB

## Run locally

```bash
npm install
npm run dev
```

Set `ROCKETRIDE_WEBHOOK_URL` before starting Vite to use the live
HydraDB → RocketRide → InsForge path. Without it, the same API route returns the
deterministic demo state.

## Validate

```bash
npm test
npm run build
```

See `../integration/README.md` for the endpoint contract and 90-second demo.
