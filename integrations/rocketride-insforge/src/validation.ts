import { InvestigationValidationError } from "./errors.js";
import type {
  ComponentStatus,
  RocketRideResultInput,
} from "./types.js";

export const COMPONENT_STATUSES = [
  "matches_design",
  "verification_incomplete",
  "unreviewed_drift",
  "insufficient_evidence",
] as const satisfies readonly ComponentStatus[];

const COMPONENT_STATUS_SET = new Set<string>(COMPONENT_STATUSES);

const OPTIONAL_NULLABLE_STRING_FIELDS = [
  "component_name",
  "reviewed_value",
  "implemented_value",
  "drive_evidence",
  "slack_evidence",
  "linear_evidence",
  "github_evidence",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isComponentStatus(value: unknown): value is ComponentStatus {
  return typeof value === "string" && COMPONENT_STATUS_SET.has(value);
}

export function validateRocketRideResult(
  value: unknown,
): RocketRideResultInput {
  if (!isRecord(value)) {
    throw new InvestigationValidationError(
      "RocketRide result must be an object",
    );
  }
  if (!isNonemptyString(value.component_id)) {
    throw new InvestigationValidationError(
      "component_id must be a non-empty string",
    );
  }
  if (!isComponentStatus(value.status)) {
    throw new InvestigationValidationError(
      "status must be one of the four statuses allowed by shared/types.ts",
    );
  }
  if (
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new InvestigationValidationError(
      "confidence must be a number between 0 and 1",
    );
  }
  if (!isNonemptyString(value.conclusion)) {
    throw new InvestigationValidationError(
      "conclusion must be a non-empty string",
    );
  }
  if (!isNonemptyString(value.recommended_action)) {
    throw new InvestigationValidationError(
      "recommended_action must be a non-empty string",
    );
  }

  for (const field of OPTIONAL_NULLABLE_STRING_FIELDS) {
    const fieldValue = value[field];
    if (
      fieldValue !== undefined &&
      fieldValue !== null &&
      typeof fieldValue !== "string"
    ) {
      throw new InvestigationValidationError(
        `${field} must be a string, null, or omitted`,
      );
    }
  }

  return value as unknown as RocketRideResultInput;
}
