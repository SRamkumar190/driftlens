import { IntentProfileStorageError } from "./errors.js";
import type {
  InsForgeRepository,
  IntentProfileDefinition,
  StoredIntentProfile,
} from "./types.js";

export const DRIFTLENS_INTENT_PROFILE = {
  name: "driftlens-medical-device-investigation",
  description:
    "Identify differences between the reviewed medical-device design and current implementation. Present evidence neutrally. Do not decide safety, compliance, or blame. Require human review for every recommendation.",
  active: true,
} as const satisfies IntentProfileDefinition;

export async function ensureIntentProfile(
  repository: InsForgeRepository,
): Promise<StoredIntentProfile> {
  let existing: StoredIntentProfile | null;
  try {
    existing = await repository.findIntentProfileByName(
      DRIFTLENS_INTENT_PROFILE.name,
    );
  } catch (error) {
    if (error instanceof IntentProfileStorageError) {
      throw error;
    }
    throw new IntentProfileStorageError(
      "Failed to look up the DriftLens intent profile",
    );
  }

  try {
    if (existing) {
      return await repository.updateIntentProfile(
        existing.id,
        DRIFTLENS_INTENT_PROFILE,
      );
    }
    return await repository.createIntentProfile(
      DRIFTLENS_INTENT_PROFILE,
    );
  } catch (error) {
    if (error instanceof IntentProfileStorageError) {
      throw error;
    }
    throw new IntentProfileStorageError(
      existing
        ? "Failed to update the DriftLens intent profile"
        : "Failed to create the DriftLens intent profile",
    );
  }
}
