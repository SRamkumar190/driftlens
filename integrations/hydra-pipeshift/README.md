# HydraDB + Pipeshift producer

Retrieves evidence from Drive, Slack, Linear, and GitHub through HydraDB, then
classifies it through a Pipeshift OpenAI-compatible endpoint. Output matches
`../../shared/types.ts` exactly and is ready for the RocketRide stage.

The adapter has three modes:

- `auto` (default): live when every provider setting is present, otherwise demo.
- `demo`: deterministic four-component dataset; no network or credentials.
- `live`: requires every setting and fails loudly when a provider is unavailable.

```bash
npm run hp:check
npm run hp:investigate
npm run hp:investigate -- controller_01 --demo
npm run hp:investigate -- occlusion_sensor_01 --live
```

Live variables:

```env
HYDRADB_API_KEY=
HYDRADB_TENANT_ID=
PIPESHIFT_API_KEY=
PIPESHIFT_BASE_URL=
PIPESHIFT_MODEL=
```

HydraDB calls `POST https://api.hydradb.com/recall/full_recall` once per source,
scoped with `metadata.source_type`. Pipeshift is configurable because each
deployed model exposes its own endpoint and model identifier.
