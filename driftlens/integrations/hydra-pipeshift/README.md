# integrations/hydra-pipeshift/

**Owner:** Person 2

**Responsibility:** HydraDB retrieval across Drive, Slack, Linear, and GitHub, and
Pipeshift classification of the retrieved evidence into a component-level result.

**Expected input:** A `component_id` (or component name) to investigate, plus
connector access to Google Drive, Slack, Linear, and GitHub.

**Expected output:** A `ComponentResult`-shaped JSON object (see `../../shared/types.ts`)
with `status`, `reviewed_value`, `implemented_value`, `confidence`, and the four
`*_evidence` fields populated for that component. This output is passed to
`integrations/rocketride-insforge/`.

**How to run:** _Not yet implemented — instructions added once retrieval and
classification logic exist._
