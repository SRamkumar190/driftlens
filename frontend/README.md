# DriftLens frontend

React and React Three Fiber interface for reviewing medical-device design drift.

The frontend provides:

- A judge-focused landing page at `/`
- An interactive medical-device review workspace at `/review`
- Component selection, camera focus, and evidence review
- Local demo data for the hackathon flow

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm test
npm run build
```

The integration layer can later provide the reviewed values, current values, evidence, conclusions, and recommended actions used by the workspace.
