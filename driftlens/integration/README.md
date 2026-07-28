# integration/

**Owner:** Person 4

**Responsibility:** Connect all parts and prepare the working demo — the glue
between `frontend/`, `integrations/hydra-pipeshift/`, and
`integrations/rocketride-insforge/`.

**Expected input:** A request from the frontend (e.g. `POST /api/investigate`)
identifying which component to investigate.

**Expected output:** A single `ComponentResult`-shaped JSON object (see
`../shared/types.ts`), assembled by calling `hydra-pipeshift` then
`rocketride-insforge` in sequence, returned to the frontend.

**How to run:** _Not yet implemented — instructions added once the endpoint exists._
