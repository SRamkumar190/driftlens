import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createInvestigationStore,
  DRIFTLENS_INTENT_PROFILE,
  ensureIntentProfile,
  InMemoryInsForgeRepository,
  validateRocketRideResult,
} from "../src/index.js";

const samplePath = new URL("../test-data.json", import.meta.url);

async function loadSample() {
  return validateRocketRideResult(
    JSON.parse(await readFile(samplePath, "utf8")),
  );
}

test("sample result is stored with pending review status", async () => {
  const repository = new InMemoryInsForgeRepository();
  const store = createInvestigationStore(repository);
  const saved = await store.storeInvestigation(await loadSample());

  assert.equal(saved.component_id, "controller_01");
  assert.equal(saved.review_status, "pending");
  assert.equal(saved.intent_profile_id, "intent-1");
});

test("latest component result is updated and review status resets", async () => {
  const repository = new InMemoryInsForgeRepository();
  const store = createInvestigationStore(repository);
  const sample = await loadSample();
  const first = await store.storeInvestigation(sample);

  repository.setReviewStatus(first.component_id, "approved");
  const updated = await store.storeInvestigation({
    ...sample,
    confidence: 0.91,
    conclusion: "Updated neutral conclusion for human review",
  });

  assert.equal(updated.id, first.id);
  assert.equal(updated.confidence, 0.91);
  assert.equal(updated.review_status, "pending");
  assert.equal(repository.investigationCount, 1);
});

test("caller-supplied review status is ignored on the initial write", async () => {
  const repository = new InMemoryInsForgeRepository();
  const store = createInvestigationStore(repository);
  const sample = await loadSample();
  const callerPayload = {
    ...sample,
    review_status: "approved",
  };

  const saved = await store.storeInvestigation(callerPayload);
  assert.equal(saved.review_status, "pending");
});

test("intent profile setup is idempotent and restores the exact profile", async () => {
  const repository = new InMemoryInsForgeRepository();
  const first = await ensureIntentProfile(repository);
  const second = await ensureIntentProfile(repository);

  assert.equal(first.id, second.id);
  assert.equal(repository.intentProfileCount, 1);
  assert.equal(second.name, DRIFTLENS_INTENT_PROFILE.name);
  assert.equal(
    second.description,
    DRIFTLENS_INTENT_PROFILE.description,
  );
  assert.equal(second.active, true);
});
