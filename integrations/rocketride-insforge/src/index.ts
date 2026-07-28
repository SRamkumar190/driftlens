import { InsForgeSdkRepository } from "./insforge-repository.js";
import {
  createInvestigationStore,
  type InvestigationStore,
} from "./store-investigation.js";
import type {
  RocketRideResultInput,
  StoredInvestigationRecord,
} from "./types.js";

export * from "./errors.js";
export {
  createInsForgeAdminClient,
  loadInsForgeConfig,
} from "./insforge-client.js";
export type {
  InsForgeConfig,
} from "./insforge-client.js";
export { InMemoryInsForgeRepository } from "./in-memory-repository.js";
export { InsForgeSdkRepository } from "./insforge-repository.js";
export {
  DRIFTLENS_INTENT_PROFILE,
  ensureIntentProfile,
} from "./intent-profile.js";
export {
  buildInvestigationRecord,
  createInvestigationStore,
  InvestigationStore,
} from "./store-investigation.js";
export {
  COMPONENT_STATUSES,
  isComponentStatus,
  validateRocketRideResult,
} from "./validation.js";
export type * from "./types.js";

let defaultStore: InvestigationStore | null = null;

function getDefaultStore(): InvestigationStore {
  defaultStore ??= createInvestigationStore(
    new InsForgeSdkRepository(),
  );
  return defaultStore;
}

export async function storeInvestigation(
  result: RocketRideResultInput,
): Promise<StoredInvestigationRecord> {
  return getDefaultStore().storeInvestigation(result);
}
