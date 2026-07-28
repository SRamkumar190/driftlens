# frontend/

**Owner:** Person 1

**Responsibility:** 3D model, component selection, status colors, and the evidence panel.

**Expected input:** A `ComponentResult` (see `../shared/types.ts`) for the currently
selected component, delivered by `integration/`'s `POST /api/investigate` endpoint.

**Expected output:** A rendered device with each component colored by `status`
(`matches_design` / `verification_incomplete` / `unreviewed_drift` / `insufficient_evidence`),
and an evidence panel that displays a selected component's `reviewed_value`,
`implemented_value`, `drive_evidence`, `slack_evidence`, `linear_evidence`,
`github_evidence`, `conclusion`, and `recommended_action`.

**How to run:** _Not yet implemented — instructions added once the frontend app scaffold exists._
