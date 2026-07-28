# DriftLens InsForge storage

This package stores the final result of a DriftLens component investigation after
RocketRide has produced the conclusion and recommended action.

It performs two small, reusable jobs:

1. Ensure the single active DriftLens intent profile exists in InsForge.
2. Store one latest investigation per `component_id`, always resetting its human
   review status to `"pending"`.

This layer does not run RocketRide, expose an API endpoint, retrieve evidence, or
make safety, compliance, fault, blame, approval, or responsibility decisions.
Stored results remain evidence and recommendations for a qualified human reviewer.

## Requirements

- Node.js 20 or newer
- An InsForge project
- The project API URL and a server-side project API key

Install the package:

```bash
cd integrations/rocketride-insforge
npm install
```

## Environment variables

Copy `.env.example` to an uncommitted local `.env`, or export these variables in
the server process:

```env
INSFORGE_API_URL=https://your-app.insforge.app
INSFORGE_API_KEY=your-server-project-api-key
```

`INSFORGE_API_KEY` is used only with InsForge's server-side
`createAdminClient`. Never expose it to frontend code. This package does not load
`.env` automatically; the final application should load its environment before
calling the exported function.

## Create the database schema

The schema is in `schema.sql`. It creates:

- `intent_profiles`, with a unique stable profile name.
- `investigation_results`, with a unique `component_id` so each component has one
  latest result.
- Database constraints for the four component statuses, confidence from `0` to
  `1`, and the four documented human review states.
- Timestamp triggers for `updated_at`.

From this folder, link the CLI to the intended project once:

```bash
npx @insforge/cli link
```

Then apply the exact schema:

```bash
npx @insforge/cli db import schema.sql
```

The same SQL can be pasted into InsForge Database Studio if the team prefers the
dashboard. Review the target project before running either option.

## Use from the integration endpoint

Person 4 can call the package after RocketRide returns a final result:

```typescript
import {
  storeInvestigation,
} from "../integrations/rocketride-insforge/src/index.js";

const savedRecord = await storeInvestigation(rocketRideResult);
```

`ComponentResult` from `shared/types.ts` is accepted directly. A minimal
RocketRide result containing the five required fields is also accepted:

```json
{
  "component_id": "controller_01",
  "status": "unreviewed_drift",
  "confidence": 0.96,
  "conclusion": "Implementation changed without complete review evidence",
  "recommended_action": "Send for engineering and quality review"
}
```

The saved record contains:

```json
{
  "component_id": "controller_01",
  "status": "unreviewed_drift",
  "confidence": 0.96,
  "conclusion": "Implementation changed without complete review evidence",
  "recommended_action": "Send for engineering and quality review",
  "review_status": "pending"
}
```

Additional component and evidence fields are preserved when supplied. Missing
optional evidence remains `null`.

The caller cannot choose the initial review status. Both inserts and updates set
`review_status` to `"pending"`, including when a previous record had been approved,
rejected, or marked as needing changes.

## Intent profile

`DRIFTLENS_INTENT_PROFILE` is the reusable source of truth:

```typescript
{
  name: "driftlens-medical-device-investigation",
  description:
    "Identify differences between the reviewed medical-device design and current implementation. Present evidence neutrally. Do not decide safety, compliance, or blame. Require human review for every recommendation.",
  active: true
}
```

`ensureIntentProfile()` finds the profile by its unique name. It creates the
profile when absent and updates/reactivates the existing row otherwise, so repeated
calls do not create duplicate active profiles.

## Tests and local demonstration

No live credentials are required for unit tests:

```bash
npm run typecheck
npm test
npm run demo
```

The tests and demo use an in-memory repository with `test-data.json`. They verify
validation, idempotent intent setup, latest-result updates, and the mandatory
`"pending"` review status.

To exercise the real InsForge project after applying the schema and exporting the
environment variables:

```bash
npm run demo:live
```

The live demo stores `test-data.json`. Run it only against the intended hackathon
project.

## Public exports

- `storeInvestigation(result)` — configured live entry point for Person 4.
- `ensureIntentProfile(repository)` — idempotent intent-profile operation.
- `createInvestigationStore(repository)` — dependency-injected storage service.
- `buildInvestigationRecord(...)` — pure validation/record construction.
- `InsForgeSdkRepository` — official SDK-backed repository.
- `InMemoryInsForgeRepository` — local test/demo repository.

## Error behavior

The package throws clear typed errors for:

- Missing or invalid InsForge configuration.
- Invalid required or optional RocketRide fields.
- Intent-profile lookup, creation, or update failures.
- Investigation lookup, creation, or update failures.
- Malformed rows returned by InsForge.

Errors identify the failed operation but do not include or log the API key.

## Assumptions and limitations

- The integration uses `@insforge/sdk` and its trusted-server
  `createAdminClient({ baseUrl, apiKey })` convention.
- The documented SDK exposes select, insert, and filtered update operations but
  does not document an upsert method. This package therefore performs
  find-then-update-or-create and relies on unique database constraints.
- A simultaneous first write for the same new component can produce one unique-key
  conflict. Retrying the request will then follow the update path.
- This package stores only the latest investigation. It intentionally does not
  implement audit history or a human-review workflow.
- Configure database access policies so these tables are writable only from
  trusted server-side code. No frontend should receive the project API key.
