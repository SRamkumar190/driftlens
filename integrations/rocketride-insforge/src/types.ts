import type {
  ComponentResult,
  ComponentStatus,
} from "../../../shared/types.js";

export type {
  ComponentResult,
  ComponentStatus,
} from "../../../shared/types.js";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_changes";

type RequiredRocketRideFields = Pick<
  ComponentResult,
  | "component_id"
  | "status"
  | "confidence"
  | "conclusion"
  | "recommended_action"
>;

export interface OptionalRocketRideFields {
  component_name?: ComponentResult["component_name"] | null;
  reviewed_value?: ComponentResult["reviewed_value"];
  implemented_value?: ComponentResult["implemented_value"];
  drive_evidence?: ComponentResult["drive_evidence"];
  slack_evidence?: ComponentResult["slack_evidence"];
  linear_evidence?: ComponentResult["linear_evidence"];
  github_evidence?: ComponentResult["github_evidence"];
}

export type RocketRideResultInput = RequiredRocketRideFields &
  OptionalRocketRideFields;

export interface IntentProfileDefinition {
  name: string;
  description: string;
  active: boolean;
}

export interface StoredIntentProfile extends IntentProfileDefinition {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface InvestigationWriteRecord {
  component_id: string;
  component_name: string | null;
  status: ComponentStatus;
  reviewed_value: string | null;
  implemented_value: string | null;
  confidence: number;
  drive_evidence: string | null;
  slack_evidence: string | null;
  linear_evidence: string | null;
  github_evidence: string | null;
  conclusion: string;
  recommended_action: string;
  review_status: "pending";
  intent_profile_id: string;
  updated_at: string;
}

export type StoredInvestigationRecord = Omit<
  InvestigationWriteRecord,
  "review_status"
> & {
  id: string;
  review_status: ReviewStatus;
  created_at: string;
};

export interface InsForgeRepository {
  findIntentProfileByName(
    name: string,
  ): Promise<StoredIntentProfile | null>;
  createIntentProfile(
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile>;
  updateIntentProfile(
    id: string,
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile>;
  findInvestigationByComponentId(
    componentId: string,
  ): Promise<StoredInvestigationRecord | null>;
  createInvestigation(
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord>;
  updateInvestigation(
    id: string,
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord>;
}
