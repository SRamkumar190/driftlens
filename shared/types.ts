export interface ComponentResult {
  component_id: string;
  component_name: string;
  status:
    | "matches_design"
    | "verification_incomplete"
    | "unreviewed_drift"
    | "insufficient_evidence";
  reviewed_value: string | null;
  implemented_value: string | null;
  confidence: number;
  drive_evidence: string | null;
  slack_evidence: string | null;
  linear_evidence: string | null;
  github_evidence: string | null;
  conclusion: string;
  recommended_action: string;
}
