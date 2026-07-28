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

---

## The pipeline

```text
webhook_1 → prompt_1 → llm_anthropic_1 → guardrails_1 → response_answers_1
 (JSON in)  (mapping)    (Claude)         (json guard)   (laneName:
                                                          "investigation")
```

Every provider and every lane above was cross-checked against
`.rocketride/services-catalog.json` (124 entries). No invented node types.

| Node | Provider | Lane in → out | Why |
|---|---|---|---|
| `webhook_1` | `webhook` | `_source` → `questions` | `webhook` emits `questions` directly, so no `question` converter is needed |
| `prompt_1` | `prompt` | `questions` → `questions` | Carries the validation rule + the status→conclusion table |
| `llm_anthropic_1` | `llm_anthropic` | `questions` → `answers` | Profile `claude-sonnet-4-6` |
| `guardrails_1` | `guardrails` | `answers` → `answers` | `strict` profile, `expected_format: json`, `policy_mode: warn` |
| `response_answers_1` | `response_answers` | `answers` → — | Returns under the key `investigation` |

**Why no code node.** `tool_python` and every other `tool_*` provider has empty
`lanes: {}` — tools are invoked by agents through the `control` array, never wired
to a webhook by a data lane. A deterministic mapping therefore cannot live in a
lane-wired code node. Note also that `transform`, used in the official
`ROCKETRIDE_QUICKSTART.md` example, **does not exist** in the schema or catalog.

**Determinism.** Because an LLM is not a reliable literal-string emitter, the
mapping table lives in `prompt_1` *and* in [statusMap.ts](statusMap.ts).
`reconcile()` re-asserts the canonical strings on the way out and logs a warning
if the model reworded anything, so the output is exact regardless of the model.
The status enum is enforced in three places: before the call
(`assertValidPayload`), inside the pipeline (`prompt_1` instructions), and in the
database (`CHECK` constraint in [insforge/schema.sql](insforge/schema.sql)).

## Files

| File | Purpose |
|---|---|
| [drift_investigation.pipe](drift_investigation.pipe) | The pipeline. Canonical definition — edit this one |
| [statusMap.ts](statusMap.ts) | Status→conclusion table, validation, `reconcile()`, `toFrontendResult()` |
| [investigate.ts](investigate.ts) | Runs the pipeline and returns the result |
| [insforgeStore.ts](insforgeStore.ts) | InsForge persistence (`"pending"` review status) |
| [insforge/schema.sql](insforge/schema.sql) | Tables, indexes, RLS, seed intent profile |
| [check.ts](check.ts) | Pre-flight: env, pipeline shape, mapping, connectivity |
| [sync-canvas.ts](sync-canvas.ts) | Mirrors the graph into repo-root `new.pipe` for the visual canvas |
| [loadEnv.ts](loadEnv.ts) | Loads `.env` with no extra dependency |
| `payload.*.json` | Sample inputs (`controller_01`, `occlusion_sensor_01`) |

`new.pipe` at the repo root is a **generated view** of this pipeline so the
RocketRide VS Code extension renders it in the main canvas tab. It keeps its own
`project_id` (the docs require a unique GUID per file). Never edit it by hand —
edit `drift_investigation.pipe` and run `npm run rr:sync-canvas`.

## How to run

```bash
npm install                       # from the repo root
cp .env.example .env              # then fill in the keys below

npm run rr:check                  # pre-flight
npm run rr:investigate            # runs the controller_01 payload
npm run rr:investigate -- --frontend   # 5-field frontend shape
npm run rr:investigate -- --persist    # also save to InsForge as "pending"
npm run rr:sync-canvas            # regenerate new.pipe after editing the pipeline
npm run typecheck
```

### Required environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `ROCKETRIDE_URI` | everything | Must match `rocketride.hostUrl` in the extension settings |
| `ROCKETRIDE_APIKEY` | everything | **`APIKEY`, no underscore** — this is what the SDK reads |
| `ROCKETRIDE_ANTHROPIC_KEY` | `llm_anthropic_1` | From console.anthropic.com; needs API credits |
| `INSFORGE_URL` | `--persist` | The `oss_host` field in `.insforge/project.json` |
| `INSFORGE_API_KEY` | `--persist` | Admin key — server-side only, never ship to the frontend |

### InsForge setup

```bash
npx @insforge/cli link
npx @insforge/cli db query --file integrations/rocketride-insforge/insforge/schema.sql
```

Two tables. `driftlens_intent_profiles` holds the active investigation intent;
`driftlens_investigations` is an **append-only** log — a re-run never overwrites
an earlier classification, because in a device-review context the prior evidence
must stay auditable. "Latest" is a query (`getLatestInvestigation`), not an
overwrite. Writes go through the admin key only; `anon`/`authenticated` have
`SELECT` and no write policies, so the frontend is strictly read-only.

## Known blockers

1. **`ROCKETRIDE_APIKEY` lacks the `task.control` permission.** The key
   authenticates and `connect()` succeeds, but `use()` fails with
   `Permission 'task.control' denied`, so the pipeline cannot execute yet. Needs
   a key with pipeline-execution scope. Not a pipeline-structure problem — the
   graph validates against the catalog.
2. **`ROCKETRIDE_ANTHROPIC_KEY` is empty.** Needed by `llm_anthropic_1`.
3. **InsForge project is not linked** — no `.insforge/project.json`, so
   `INSFORGE_URL` is unknown and the migration has not been applied.

## Open contract question

Two response shapes are in play and both are supported:

- **Full** (default) — all input fields plus `conclusion` and
  `recommended_action`, matching `ComponentResult` in `../../shared/types.ts`.
- **Narrow** (`--frontend` / `toFrontendResult()`) — `component_id`, `status`,
  `confidence`, `conclusion`, `recommended_action` only.

The canonical strings here carry **trailing periods**, matching
`../../shared/sample-response.json`. One spec draft showed them without periods.
If the no-period form is authoritative, change the four entries in
[statusMap.ts](statusMap.ts) and the matching lines in
[drift_investigation.pipe](drift_investigation.pipe) — `npm run rr:check`
verifies the two files still agree.
