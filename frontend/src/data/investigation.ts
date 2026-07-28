import type {
  ComponentId,
  DeviceComponent,
  EvidenceItem,
  ReviewStatus,
  SourceMode,
} from './components';

export interface ApiComponentResult {
  component_id: string;
  component_name: string;
  status:
    | 'matches_design'
    | 'verification_incomplete'
    | 'unreviewed_drift'
    | 'insufficient_evidence';
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

export interface InvestigateApiResponse {
  investigation_id: string;
  review_status: 'pending';
  components: ApiComponentResult[];
  response_source: 'rocketride' | 'demo_fallback';
}

export const apiComponentIdMap: Record<string, ComponentId> = {
  controller_01: 'main-controller',
  main_controller: 'main-controller',
  'main-controller': 'main-controller',
  occlusion_sensor_01: 'occlusion-sensor',
  occlusion_sensor: 'occlusion-sensor',
  'occlusion-sensor': 'occlusion-sensor',
  flow_sensor_01: 'flow-sensor',
  'flow-sensor': 'flow-sensor',
  pump_motor_01: 'pump-motor',
  'pump-motor': 'pump-motor',
  battery_module_01: 'battery-module',
  'battery-module': 'battery-module',
};

const apiStatusMap: Record<ApiComponentResult['status'], ReviewStatus> = {
  matches_design: 'approved',
  verification_incomplete: 'warning',
  unreviewed_drift: 'critical',
  insufficient_evidence: 'unreviewed',
};

function confidencePercent(confidence: number) {
  return Math.round(confidence <= 1 ? confidence * 100 : confidence);
}

function evidenceItems(
  component: ApiComponentResult,
  sourceMode: SourceMode,
): EvidenceItem[] {
  const github: EvidenceItem = {
    source: 'GitHub',
    reference: 'Current implementation',
    summary: component.github_evidence ?? 'No GitHub implementation evidence found',
  };

  if (sourceMode === 'github-only') return [github];

  return [
    github,
    {
      source: 'Drive',
      reference: 'Reviewed specification',
      summary: component.drive_evidence ?? 'No Drive evidence found',
    },
    {
      source: 'Slack',
      reference: 'Engineering discussion',
      summary: component.slack_evidence ?? 'No Slack evidence found',
    },
    {
      source: 'Linear',
      reference: 'Review and verification',
      summary: component.linear_evidence ?? 'No Linear evidence found',
    },
  ];
}

export function componentIdFromApi(componentId: string): ComponentId | null {
  return apiComponentIdMap[componentId] ?? null;
}

export function toDeviceComponent(
  component: ApiComponentResult,
  sourceMode: SourceMode,
): DeviceComponent | null {
  const id = componentIdFromApi(component.component_id);
  if (!id) return null;

  return {
    id,
    name: component.component_name,
    status: apiStatusMap[component.status],
    currentValue: component.implemented_value ?? 'Not available',
    approvedValue: component.reviewed_value ?? 'Not available',
    confidence: confidencePercent(component.confidence),
    conclusion: component.conclusion,
    recommendation: component.recommended_action,
    evidence: evidenceItems(component, sourceMode),
  };
}

export function mapInvestigationComponents(
  response: InvestigateApiResponse,
  sourceMode: SourceMode,
) {
  return response.components.reduce<Partial<Record<ComponentId, DeviceComponent>>>(
    (mapped, component) => {
      const deviceComponent = toDeviceComponent(component, sourceMode);
      if (deviceComponent) mapped[deviceComponent.id] = deviceComponent;
      return mapped;
    },
    {},
  );
}
