import assert from "node:assert/strict";
import test from "node:test";

import {
  createInvestigationStore,
  InMemoryInsForgeRepository,
  IntentProfileStorageError,
  InvestigationStorageError,
  type RocketRideResultInput,
} from "../src/index.js";

const minimalResult: RocketRideResultInput = {
  component_id: "controller_01",
  status: "unreviewed_drift",
  confidence: 0.96,
  conclusion: "Implementation changed without complete review evidence",
  recommended_action: "Send for engineering and quality review",
};

class IntentLookupFailureRepository extends InMemoryInsForgeRepository {
  override async findIntentProfileByName(): Promise<never> {
    throw new Error("simulated request failure");
  }
}

class InvestigationLookupFailureRepository extends InMemoryInsForgeRepository {
  override async findInvestigationByComponentId(): Promise<never> {
    throw new Error("simulated request failure");
  }
}

class IntentCreateFailureRepository extends InMemoryInsForgeRepository {
  override async createIntentProfile(): Promise<never> {
    throw new Error("simulated create failure");
  }
}

class InvestigationCreateFailureRepository extends InMemoryInsForgeRepository {
  override async createInvestigation(): Promise<never> {
    throw new Error("simulated create failure");
  }
}

test("intent-profile request failures become clear storage errors", async () => {
  const store = createInvestigationStore(
    new IntentLookupFailureRepository(),
  );

  await assert.rejects(
    () => store.storeInvestigation(minimalResult),
    (error: unknown) =>
      error instanceof IntentProfileStorageError &&
      /intent profile/i.test(error.message),
  );
});

test("investigation request failures become clear storage errors", async () => {
  const store = createInvestigationStore(
    new InvestigationLookupFailureRepository(),
  );

  await assert.rejects(
    () => store.storeInvestigation(minimalResult),
    (error: unknown) =>
      error instanceof InvestigationStorageError &&
      /investigation/i.test(error.message),
  );
});

test("intent-profile creation failures identify the failed operation", async () => {
  const store = createInvestigationStore(
    new IntentCreateFailureRepository(),
  );

  await assert.rejects(
    () => store.storeInvestigation(minimalResult),
    (error: unknown) =>
      error instanceof IntentProfileStorageError &&
      /create.*intent profile/i.test(error.message),
  );
});

test("investigation creation failures identify the failed operation", async () => {
  const store = createInvestigationStore(
    new InvestigationCreateFailureRepository(),
  );

  await assert.rejects(
    () => store.storeInvestigation(minimalResult),
    (error: unknown) =>
      error instanceof InvestigationStorageError &&
      /create.*investigation/i.test(error.message),
  );
});
