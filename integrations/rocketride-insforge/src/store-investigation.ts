import {
  InvestigationStorageError,
  InvestigationValidationError,
} from "./errors.js";
import { ensureIntentProfile } from "./intent-profile.js";
import type {
  InsForgeRepository,
  InvestigationWriteRecord,
  RocketRideResultInput,
  StoredInvestigationRecord,
} from "./types.js";
import { validateRocketRideResult } from "./validation.js";

export interface InvestigationStoreOptions {
  clock?: () => Date;
}

export function buildInvestigationRecord(
  resultValue: unknown,
  intentProfileId: string,
  now: Date = new Date(),
): InvestigationWriteRecord {
  const result = validateRocketRideResult(resultValue);
  if (!intentProfileId.trim()) {
    throw new InvestigationValidationError(
      "intentProfileId must be a non-empty string",
    );
  }

  return {
    component_id: result.component_id.trim(),
    component_name: result.component_name ?? null,
    status: result.status,
    reviewed_value: result.reviewed_value ?? null,
    implemented_value: result.implemented_value ?? null,
    confidence: result.confidence,
    drive_evidence: result.drive_evidence ?? null,
    slack_evidence: result.slack_evidence ?? null,
    linear_evidence: result.linear_evidence ?? null,
    github_evidence: result.github_evidence ?? null,
    conclusion: result.conclusion,
    recommended_action: result.recommended_action,
    review_status: "pending",
    intent_profile_id: intentProfileId,
    updated_at: now.toISOString(),
  };
}

export class InvestigationStore {
  private readonly clock: () => Date;

  constructor(
    private readonly repository: InsForgeRepository,
    options: InvestigationStoreOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  async storeInvestigation(
    result: RocketRideResultInput,
  ): Promise<StoredInvestigationRecord> {
    validateRocketRideResult(result);
    const intentProfile = await ensureIntentProfile(this.repository);
    const record = buildInvestigationRecord(
      result,
      intentProfile.id,
      this.clock(),
    );

    let existing: StoredInvestigationRecord | null;
    try {
      existing =
        await this.repository.findInvestigationByComponentId(
          record.component_id,
        );
    } catch (error) {
      if (error instanceof InvestigationStorageError) {
        throw error;
      }
      throw new InvestigationStorageError(
        "Failed to look up the latest investigation result",
      );
    }

    try {
      if (existing) {
        return await this.repository.updateInvestigation(
          existing.id,
          record,
        );
      }
      return await this.repository.createInvestigation(record);
    } catch (error) {
      if (error instanceof InvestigationStorageError) {
        throw error;
      }
      throw new InvestigationStorageError(
        existing
          ? "Failed to update the latest investigation result"
          : "Failed to create the investigation result",
      );
    }
  }
}

export function createInvestigationStore(
  repository: InsForgeRepository,
  options: InvestigationStoreOptions = {},
): InvestigationStore {
  return new InvestigationStore(repository, options);
}
