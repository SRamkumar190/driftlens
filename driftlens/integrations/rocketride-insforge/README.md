# integrations/rocketride-insforge/

**Owner:** Person 3

**Responsibility:** Run the RocketRide Cloud pipeline (validate → generate final
conclusion → return frontend-ready JSON) and store the intent profile and latest
investigation result in InsForge with review status `"pending"`.

**Expected input:** The JSON produced by `integrations/hydra-pipeshift/` (HydraDB +
Pipeshift output) — see `../../shared/sample-response.json` for the shape.

**Expected output:** A `ComponentResult`-shaped JSON object (see `../../shared/types.ts`)
with `conclusion` and `recommended_action` finalized, saved to InsForge alongside
the active intent profile and a `"pending"` review status. This output is what
`integration/`'s endpoint returns to the frontend.

**How to run:** _Not yet implemented — instructions added once the pipeline is deployed._
