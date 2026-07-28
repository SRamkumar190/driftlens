import type { InsForgeClient } from "@insforge/sdk";

import {
  InsForgeResponseError,
  IntentProfileStorageError,
  InvestigationStorageError,
} from "./errors.js";
import { createInsForgeAdminClient } from "./insforge-client.js";
import type {
  InsForgeRepository,
  IntentProfileDefinition,
  InvestigationWriteRecord,
  ReviewStatus,
  StoredIntentProfile,
  StoredInvestigationRecord,
} from "./types.js";
import { isComponentStatus } from "./validation.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRow(data: unknown): unknown | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

function requiredString(
  row: Record<string, unknown>,
  field: string,
): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new InsForgeResponseError(
      `InsForge returned an invalid ${field} field`,
    );
  }
  return value;
}

function nullableString(
  row: Record<string, unknown>,
  field: string,
): string | null {
  const value = row[field];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new InsForgeResponseError(
      `InsForge returned an invalid ${field} field`,
    );
  }
  return value;
}

function mapIntentProfile(rowValue: unknown): StoredIntentProfile {
  if (!isRecord(rowValue)) {
    throw new InsForgeResponseError(
      "InsForge returned an invalid intent profile row",
    );
  }
  if (typeof rowValue.active !== "boolean") {
    throw new InsForgeResponseError(
      "InsForge returned an invalid active field",
    );
  }

  return {
    id: requiredString(rowValue, "id"),
    name: requiredString(rowValue, "name"),
    description: requiredString(rowValue, "description"),
    active: rowValue.active,
    created_at: requiredString(rowValue, "created_at"),
    updated_at: requiredString(rowValue, "updated_at"),
  };
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "needs_changes"
  );
}

function mapInvestigation(
  rowValue: unknown,
): StoredInvestigationRecord {
  if (!isRecord(rowValue)) {
    throw new InsForgeResponseError(
      "InsForge returned an invalid investigation row",
    );
  }
  if (!isComponentStatus(rowValue.status)) {
    throw new InsForgeResponseError(
      "InsForge returned an invalid component status",
    );
  }
  if (!isReviewStatus(rowValue.review_status)) {
    throw new InsForgeResponseError(
      "InsForge returned an invalid review status",
    );
  }
  if (
    typeof rowValue.confidence !== "number" ||
    !Number.isFinite(rowValue.confidence) ||
    rowValue.confidence < 0 ||
    rowValue.confidence > 1
  ) {
    throw new InsForgeResponseError(
      "InsForge returned an invalid confidence value",
    );
  }

  return {
    id: requiredString(rowValue, "id"),
    component_id: requiredString(rowValue, "component_id"),
    component_name: nullableString(rowValue, "component_name"),
    status: rowValue.status,
    reviewed_value: nullableString(rowValue, "reviewed_value"),
    implemented_value: nullableString(rowValue, "implemented_value"),
    confidence: rowValue.confidence,
    drive_evidence: nullableString(rowValue, "drive_evidence"),
    slack_evidence: nullableString(rowValue, "slack_evidence"),
    linear_evidence: nullableString(rowValue, "linear_evidence"),
    github_evidence: nullableString(rowValue, "github_evidence"),
    conclusion: requiredString(rowValue, "conclusion"),
    recommended_action: requiredString(rowValue, "recommended_action"),
    review_status: rowValue.review_status,
    intent_profile_id: requiredString(rowValue, "intent_profile_id"),
    created_at: requiredString(rowValue, "created_at"),
    updated_at: requiredString(rowValue, "updated_at"),
  };
}

function requireReturnedRow(data: unknown, operation: string): unknown {
  const row = firstRow(data);
  if (row === null) {
    throw new InsForgeResponseError(
      `InsForge returned no row after ${operation}`,
    );
  }
  return row;
}

export class InsForgeSdkRepository implements InsForgeRepository {
  constructor(
    private readonly client: InsForgeClient =
      createInsForgeAdminClient(),
  ) {}

  async findIntentProfileByName(
    name: string,
  ): Promise<StoredIntentProfile | null> {
    try {
      const { data, error } = await this.client.database
        .from("intent_profiles")
        .select("*")
        .eq("name", name)
        .limit(1);
      if (error) {
        throw error;
      }
      const row = firstRow(data);
      return row === null ? null : mapIntentProfile(row);
    } catch {
      throw new IntentProfileStorageError(
        "InsForge request failed while looking up the intent profile",
      );
    }
  }

  async createIntentProfile(
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile> {
    try {
      const { data, error } = await this.client.database
        .from("intent_profiles")
        .insert(profile)
        .select("*");
      if (error) {
        throw error;
      }
      return mapIntentProfile(
        requireReturnedRow(data, "creating the intent profile"),
      );
    } catch {
      throw new IntentProfileStorageError(
        "InsForge failed to create the DriftLens intent profile",
      );
    }
  }

  async updateIntentProfile(
    id: string,
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile> {
    try {
      const { data, error } = await this.client.database
        .from("intent_profiles")
        .update(profile)
        .eq("id", id)
        .select("*");
      if (error) {
        throw error;
      }
      return mapIntentProfile(
        requireReturnedRow(data, "updating the intent profile"),
      );
    } catch {
      throw new IntentProfileStorageError(
        "InsForge failed to update the DriftLens intent profile",
      );
    }
  }

  async findInvestigationByComponentId(
    componentId: string,
  ): Promise<StoredInvestigationRecord | null> {
    try {
      const { data, error } = await this.client.database
        .from("investigation_results")
        .select("*")
        .eq("component_id", componentId)
        .limit(1);
      if (error) {
        throw error;
      }
      const row = firstRow(data);
      return row === null ? null : mapInvestigation(row);
    } catch {
      throw new InvestigationStorageError(
        "InsForge request failed while looking up the latest investigation",
      );
    }
  }

  async createInvestigation(
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord> {
    try {
      const { data, error } = await this.client.database
        .from("investigation_results")
        .insert(record)
        .select("*");
      if (error) {
        throw error;
      }
      return mapInvestigation(
        requireReturnedRow(data, "creating the investigation"),
      );
    } catch {
      throw new InvestigationStorageError(
        "InsForge failed to create the investigation result",
      );
    }
  }

  async updateInvestigation(
    id: string,
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord> {
    try {
      const { data, error } = await this.client.database
        .from("investigation_results")
        .update(record)
        .eq("id", id)
        .select("*");
      if (error) {
        throw error;
      }
      return mapInvestigation(
        requireReturnedRow(data, "updating the investigation"),
      );
    } catch {
      throw new InvestigationStorageError(
        "InsForge failed to update the latest investigation result",
      );
    }
  }
}
