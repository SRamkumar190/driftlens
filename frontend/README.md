# DriftLens frontend

Interactive medical-device evidence review built with vinext.

- Exploded-view infusion pump with selectable components.
- Status colors for all shared `ComponentResult` states.
- Reviewed-versus-implemented comparison.
- Drive, Slack, Linear, and GitHub evidence trail.
- Responsive layout and keyboard-accessible controls.
- `POST /api/investigate` demo endpoint using the shared response contract.

```bash
npm install
npm run dev
npm test
npm run lint
```

The site uses a realistic local dataset so the demo works without provider
credentials. The root integration server supplies the live HydraDB → Pipeshift
→ RocketRide path.
