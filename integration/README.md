# DriftLens integration server

`POST /api/investigate` orchestrates:

```text
HydraDB retrieval -> Pipeshift classification -> RocketRide conclusion mapping
```

Run with `npm run api`, then:

```bash
curl -X POST http://localhost:8787/api/investigate \
  -H "content-type: application/json" \
  -d '{"component_id":"occlusion_sensor_01","mode":"demo"}'
```

`DRIFTLENS_ROCKETRIDE_MODE` controls the last stage:

- `preferred` (default): try RocketRide, retain the already-canonical result if
  the account lacks execution permission.
- `required`: return an error when RocketRide cannot execute.
- `off`: skip the live RocketRide call.

The response includes the full shared result plus `rocketride` provenance and an
optional warning. This keeps the demo functional while making degraded external
service state explicit.
