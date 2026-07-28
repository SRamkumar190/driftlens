# DriftLens

DriftLens is an evidence-first design-drift review workspace for medical devices,
built for Agents You Love Hackathon 2.

It compares the currently implemented value of a device component with its
reviewed design value, gathers the supporting trail from Google Drive, Slack,
Linear, and GitHub, and presents the result to a qualified human reviewer.

DriftLens does **not** decide medical safety, regulatory compliance, release
approval, or individual fault. Its job is to show what changed, which evidence
exists, which evidence is missing, and where human engineering and quality
review is required.

## Sponsor and integration story

| Sponsor / integration | How DriftLens uses it | Implementation |
|---|---|---|
| **HydraDB** | Shared evidence and memory layer for Drive, Slack, Linear, and GitHub content. Components are correlated with stable IDs such as `controller_01` and `occlusion_sensor_01`. | Connector data and the seed pack can be indexed into HydraDB. RocketRide retrieves evidence using HydraDB recall/query operations and checks provider metadata before accepting it. |
| **RocketRide** | Multi-step agent orchestration and the live analysis boundary used by the frontend. | A main webhook pipeline runs two component investigations in parallel, aggregates their evidence, executes deterministic Python classification rules, saves the result to InsForge, and returns frontend-ready JSON. A second pipeline handles recorded audio/video design-review input. |
| **InsForge** | Persistent system of record for investigations and the planned human-review workflow. | An authenticated server-side function stores investigations, optionally emails a reviewer, and returns the investigation ID. SQL adds reviewer attribution, RLS, evidence-file metadata, private storage policies, review RPCs, and realtime events. |
| **Pipeshift** | Reserved model-provider integration from the original team split. | `PIPESHIFT_API_KEY` and the `hydra-pipeshift` workspace remain in the project, but the current runtime pipelines do not invoke Pipeshift. Classification currently runs through deterministic Python inside RocketRide. |
| **Google Drive** | Reviewed specifications, design minutes, risk analysis, verification protocols, telemetry, and release evidence. | Included in the seed pack and represented as provider-tagged HydraDB evidence. |
| **Slack** | Engineering discussions, proposed value changes, rationale, and verification conversation. | Connected to HydraDB. A live test message from `#all-hjkljk` was successfully synced and retrieved from the `all-hjkljk` collection. |
| **Linear** | Formal change assessments, approval tasks, verification tasks, comments, and status history. | Included in the seed pack and represented as provider-tagged HydraDB evidence. |
| **GitHub** | Current implementation values, commits, pull requests, and code-review evidence. | Included in the seed pack and used by the All Sources workflow. The server contract still supports a diagnostic `github_only` mode, but that selector is no longer exposed in the current UI. |
| **React + Three.js** | Interactive judge-facing application and 3D device review experience. | React, React Three Fiber, Drei, and Three.js render the landing page, device assembly, component controls, evidence drawer, and analysis states. |

## End-to-end system

```text
Google Drive ─┐
Slack ────────┤
Linear ───────┼─> HydraDB ─> RocketRide ─> deterministic rules ─> InsForge
GitHub ───────┘                    ^                                  │
                                   │                                  │
React frontend ─> POST /api/investigate ──────────────────────────────┘
```

1. A reviewer opens the DriftLens review workspace.
2. The frontend sends `source_mode` and component IDs to
   `POST /api/investigate`.
3. The server-side Vite middleware calls the configured RocketRide webhook.
4. RocketRide retrieves current evidence from HydraDB.
5. Provider metadata is used to distinguish Drive, Slack, Linear, and GitHub
   evidence.
6. Fixed Python rules assign one of four review states.
7. RocketRide sends the investigation to the InsForge write function.
8. InsForge stores the complete component array with `review_status = pending`.
9. RocketRide returns the investigation ID and component results.
10. The frontend colors the 3D model and renders the evidence checklist.

## User-facing features

### Landing and review workspace

- Judge-focused product landing page at `/`.
- Interactive review workspace at `/review`.
- Client-side navigation between the overview and review experience.
- Responsive dark visual design with gold DriftLens branding.

### Five-second model preparation experience

- The review route initially presents an **Upload device file** action.
- A gold orbital spinner and progress animation run for five seconds.
- The 3D model and review workspace appear after preparation completes.
- The current implementation is a presentation flow: it does not yet read or
  transmit the selected file to a backend.

### Interactive 3D device review

- GLB-based medical-device assembly rendered with React Three Fiber.
- Orbit, zoom, component selection, and camera focus interactions.
- Component selection from either the 3D model or sidebar.
- Main Controller, Flow Sensor, Pump Motor, Occlusion Sensor, and Battery Module
  controls.
- Status-driven model coloring after analysis.

### Evidence-driven component drawer

For the selected component, the drawer displays:

- reviewed design value;
- current implementation value;
- confidence percentage;
- agent conclusion;
- recommended human-review action;
- Google Drive evidence;
- Slack evidence;
- Linear evidence;
- GitHub evidence;
- explicit found/missing indicators.

The **Draft Review Task** control is currently visual only and is not connected
to Linear or InsForge.

### Live Slack Battery Module slice

The Battery Module includes a direct, server-side Slack-to-HydraDB path that
does not depend on the RocketRide deployment:

```text
Slack #all-hjkljk -> HydraDB connector -> /api/slack-battery -> Battery Module
```

Post a structured Slack message:

```text
[battery_module_01] | BEFORE: Pack revision B | AFTER: Pack revision C | REASON: cold-weather capacity update | STATUS: verification_pending
```

After the HydraDB Slack connector syncs, running Drift Analysis queries HydraDB
collection `all-hjkljk`, extracts the four fields, and merges the live Battery
Module result into the frontend. A changed value with pending verification is
shown as Yellow.

### Review states

| UI color | API status | Meaning |
|---|---|---|
| Green | `matches_design` | Reviewed and implemented values exist and match. |
| Yellow | `verification_incomplete` | A changed value was discussed and assessed, but completed verification is missing. |
| Red | `unreviewed_drift` | Implementation evidence exists, but an approved change task is missing. |
| Gray | `insufficient_evidence` | A reviewed or implemented value cannot be proven. |

### Source mode

- The current UI runs **All Sources**, requesting Drive, Slack, Linear, and
  GitHub evidence.
- The backend contract retains `github_only` for diagnostics and automated
  tests, but the GitHub Only selector is intentionally hidden from reviewers.

## HydraDB integration

`integrations/hydra-pipeshift/ingest_seed.py`:

- reads the local Drive, Slack, Linear, and GitHub seed folders;
- creates stable memory IDs;
- adds `metadata.provider` and `additional_metadata.app_provider`;
- upserts memories through the HydraDB ingestion API;
- waits for indexing completion;
- performs a cross-provider recall smoke test.

The active main RocketRide pipe currently queries:

```text
database: love2agents
collection: all-hjkljk
```

This collection contains the connected Slack channel. Other connector resources
currently live in separate HydraDB collections, so true four-source live
retrieval requires either:

- routing all sources into one shared collection; or
- updating RocketRide to query and merge multiple collections.

The seed ingestion script defaults to collection `Ali_amjad`, which is separate
from the main pipe's current `all-hjkljk` collection.

## RocketRide integration

### Main component-analysis pipeline

`integrations/rocketride-insforge/driftlens-analysis.pipe` contains:

1. `driftlens_webhook` — accepts the investigation request.
2. `analysis_request` — converts the webhook input to the question lane.
3. `controller_analysis` — retrieves evidence for `controller_01`.
4. `occlusion_analysis` — retrieves evidence for `occlusion_sensor_01`.
5. `parallel_evidence_documents` — joins both parallel results.
6. `classify_aggregate_save` — runs the fixed Python rules and performs the
   InsForge save.
7. `driftlens_response` — returns frontend-ready JSON.

The agents must prove evidence provenance using HydraDB metadata. They are told
to return `null` for missing evidence and cannot reuse evidence from previous
webhook requests.

Classification is intentionally deterministic. The LLM retrieves and structures
evidence, but it does not choose the final status or confidence value.

### Audio/video analysis pipeline

`integrations/rocketride-insforge/driftlens-media-analysis.pipe`:

- accepts a short audio or video recording;
- transcribes it with RocketRide's transcription node;
- extracts the spoken component, old value, proposed value, and reason;
- retrieves matching HydraDB evidence;
- applies the same fixed status rules;
- writes the result to InsForge;
- returns `investigation_id` and `component_result`.

The media pipeline currently queries HydraDB collection `Ali_amjad` and saves
through InsForge's database REST endpoint. It is not yet called by the React
upload experience.

## InsForge integration

### Investigation storage

The `save-investigation` function:

- accepts only `all_sources` or `github_only`;
- requires a non-empty component array;
- authenticates callers with `X-DriftLens-Secret`;
- uses the server-only InsForge admin client;
- inserts the complete result into `public.investigations`;
- forces `review_status = pending`;
- records whether the result came from `rocketride` or `demo_fallback`;
- optionally sends a reviewer email;
- returns the generated investigation ID.

### Human-review backend

The SQL workflow defines:

- authenticated read access to investigations;
- reviewer ID and review timestamp fields;
- `review_investigation(UUID)` for marking an investigation reviewed;
- `investigation_evidence_files` metadata;
- owner-scoped private evidence storage policies;
- realtime `investigation_saved` events;
- realtime `review_status_changed` events;
- indexes for investigation history and review queues.

These backend artifacts exist in the repository. The current React application
does not yet include an InsForge SDK client, reviewer login, investigation
history, review action, evidence upload, or realtime subscription.

## Frontend/server adapter

The browser calls `/api/investigate`. During local development and preview,
`frontend/vite.config.ts` mounts a server-only middleware backed by
`integration/investigate.ts`.

The adapter:

- validates `source_mode`;
- forwards the request to `ROCKETRIDE_WEBHOOK_URL`;
- attaches `ROCKETRIDE_WEBHOOK_AUTH`;
- normalizes nested RocketRide response envelopes;
- validates the component contract;
- optionally returns deterministic demo data when live RocketRide fails;
- can persist that fallback through the same InsForge function.

Set `DRIFTLENS_DEMO_FALLBACK=false` when verifying the live system so a bad
RocketRide deployment cannot be hidden by sample results.

## Shared contract

Every integration produces a `ComponentResult` compatible with
`shared/types.ts`:

```ts
{
  component_id,
  component_name,
  status,
  reviewed_value,
  implemented_value,
  confidence,
  drive_evidence,
  slack_evidence,
  linear_evidence,
  github_evidence,
  conclusion,
  recommended_action
}
```

The frontend maps this response into the 3D component and evidence-drawer model.

## Seed demonstration

The seed pack models two intentional cases:

### Occlusion Sensor

- Component: `occlusion_sensor_01`
- Reviewed threshold: `300 mmHg`
- Implemented threshold: `400 mmHg`
- Expected state: Yellow / `verification_incomplete`
- Reason: discussion and assessment exist, but verification is incomplete.

### Main Controller

- Component: `controller_01`
- Reviewed timeout: `5 seconds`
- Implemented timeout: `7 seconds`
- Expected state: Red / `unreviewed_drift`
- Reason: a temporary implementation exists without an approved design-change
  task.

## Repository structure

```text
driftlens/
|-- frontend/                       React and Three.js application
|-- integration/                    /api/investigate server adapter
|-- integrations/
|   |-- hydra-pipeshift/            HydraDB seed ingestion and retrieval
|   `-- rocketride-insforge/        RocketRide pipes and InsForge backend
|-- driftlens-seed-pack/            Four-source demonstration evidence
|-- migrations/                     InsForge workflow migration
|-- shared/                         Common response contract
|-- README.md
`-- .env.example
```

## Local setup

1. Copy `.env.example` to `.env`.
2. Add local secrets without committing them.
3. Install and start the frontend:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

4. Open the printed local URL.

For a real RocketRide run, `ROCKETRIDE_WEBHOOK_URL` must be the
pipeline-specific webhook URL produced by the deployed RocketRide pipeline. The
generic `https://api.rocketride.ai/webhook` placeholder is not sufficient.

## Important environment variables

| Variable | Used by |
|---|---|
| `HYDRADB_API_KEY` | Local HydraDB seed ingestion |
| `HYDRADB_TENANT_ID` | HydraDB database, normally `love2agents` |
| `HYDRADB_SLACK_COLLECTION` | HydraDB collection for Slack connector retrieval |
| `ROCKETRIDE_WEBHOOK_URL` | Local server adapter |
| `ROCKETRIDE_WEBHOOK_AUTH` | Local server adapter |
| `DRIFTLENS_DEMO_FALLBACK` | Enables/disables deterministic fallback |
| `DRIFTLENS_FUNCTION_URL` | InsForge save function used by the local adapter |
| `DRIFTLENS_FUNCTION_SECRET` | Server-only InsForge function authentication |
| `ROCKETRIDE_HYDRA_DB_API_KEY` | HydraDB access inside the main RocketRide pipe |
| `ROCKETRIDE_HYDRADB_API_KEY` | HydraDB access used by the media pipe |
| `ROCKETRIDE_HYDRADB_DATABASE` | HydraDB database used by the media pipe |
| `ROCKETRIDE_INSFORGE_URL` | InsForge base URL inside RocketRide |
| `ROCKETRIDE_INSFORGE_FUNCTION_SECRET` | Main pipe's InsForge function secret |
| `ROCKETRIDE_INSFORGE_API_KEY` | Media pipe's server-side database key |
| `ROCKETRIDE_OPENAI_KEY` | Main RocketRide LLM node |
| `ROCKETRIDE_OPENROUTER_API_KEY` | Media RocketRide LLM node |

Keep all API keys and function secrets out of browser code and source control.

## Validation

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Current local validation:

- 41 tests passing across 10 test files.
- TypeScript and Vite production build passing.
- Both RocketRide `.pipe` files parse as valid JSON.

Known non-blocking warnings:

- Three.js is imported more than once in the test environment.
- The production JavaScript bundle is larger than Vite's default 500 kB
  recommendation.

## Current integration readiness

| Capability | Status |
|---|---|
| Landing page and review workspace | Implemented |
| Five-second upload/loading presentation | Implemented |
| Actual device-file upload | Not implemented |
| Interactive 3D component selection | Implemented |
| `/api/investigate` frontend integration | Implemented |
| Demo fallback | Implemented |
| Slack to HydraDB sync and retrieval | Verified |
| Slack Battery Module before/after slice | Implemented; requires a matching message in the HydraDB Slack connector |
| Main RocketRide pipeline definition | Implemented locally |
| Pipeline-specific RocketRide deployment URL | Still required |
| Main pipe querying Slack collection | Configured locally |
| Unified Drive/Slack/Linear/GitHub retrieval | Requires collection unification or multi-collection retrieval |
| InsForge schema, migration, and write function | Implemented in repository |
| Confirmed live InsForge deployment | Must be verified against the connected project |
| Frontend InsForge reviewer tools | Not implemented |
| Media-analysis RocketRide pipeline | Implemented as a standalone pipe |
| Frontend-to-media-pipeline upload | Not implemented |
