export type ComponentId =
  | 'main-controller'
  | 'occlusion-sensor'
  | 'flow-sensor'
  | 'pump-motor'
  | 'battery-module';

export type ReviewStatus = 'critical' | 'warning' | 'approved' | 'unreviewed';

export type SourceMode = 'all-sources' | 'github-only';

export type EvidenceSource = 'GitHub' | 'Drive' | 'Slack' | 'Linear' | 'Verification';

export interface EvidenceItem {
  source: EvidenceSource;
  reference: string;
  summary: string;
}

export interface DeviceComponent {
  id: ComponentId;
  name: string;
  status: ReviewStatus;
  currentValue: string;
  approvedValue: string;
  confidence: number;
  conclusion: string;
  recommendation: string;
  evidence: EvidenceItem[];
}

export const githubOnlyConclusion =
  'The approved value, reason, and review status cannot be determined.';

export const componentOrder: ComponentId[] = [
  'main-controller',
  'flow-sensor',
  'pump-motor',
  'occlusion-sensor',
  'battery-module',
];

export const components: Record<ComponentId, DeviceComponent> = {
  'main-controller': {
    id: 'main-controller',
    name: 'Main Controller',
    status: 'critical',
    currentValue: '7 seconds',
    approvedValue: '5 seconds',
    confidence: 96,
    conclusion:
      'The motor timeout exceeds the reviewed value, and there is no documented discussion or change request supporting it.',
    recommendation: 'Restore the reviewed timeout or open a controlled change request before release.',
    evidence: [
      { source: 'GitHub', reference: 'motor/constants.ts', summary: 'MOTOR_TIMEOUT_SECONDS = 7' },
      { source: 'Drive', reference: 'Design Review DR-042', summary: 'Reviewed motor timeout is 5 seconds' },
      { source: 'Slack', reference: '#pump-controls', summary: 'No matching discussion found' },
      { source: 'Linear', reference: 'MED-184', summary: 'No change request found' },
    ],
  },
  'occlusion-sensor': {
    id: 'occlusion-sensor',
    name: 'Occlusion Sensor',
    status: 'warning',
    currentValue: '400 mmHg',
    approvedValue: '300 mmHg',
    confidence: 92,
    conclusion:
      'The occlusion threshold exceeds the reviewed specification; a completed change assessment exists, but verification is not complete.',
    recommendation: 'Complete verification at the reviewed threshold or document approval for the 400 mmHg setting.',
    evidence: [
      { source: 'GitHub', reference: 'sensors/occlusion.ts', summary: 'OCCLUSION_THRESHOLD_MMHG = 400' },
      { source: 'Drive', reference: 'Sensor Requirements v4', summary: 'Reviewed specification requires 300 mmHg' },
      { source: 'Slack', reference: '#verification', summary: 'Engineers discussed false alarms during testing' },
      { source: 'Linear', reference: 'MED-207', summary: 'Change assessment completed' },
      { source: 'Verification', reference: 'Verification status', summary: 'No completed verification task' },
    ],
  },
  'flow-sensor': {
    id: 'flow-sensor',
    name: 'Flow Sensor',
    status: 'approved',
    currentValue: 'Calibration: 0.5 mL/h',
    approvedValue: 'Calibration: 0.5 mL/h',
    confidence: 96,
    conclusion: 'The flow-sensor calibration matches the approved review record.',
    recommendation: 'No action required.',
    evidence: [
      { source: 'GitHub', reference: 'sensors/flow.ts', summary: 'Calibration constant matches the released configuration.' },
      { source: 'Drive', reference: 'Calibration Record CR-18', summary: 'Approved calibration is 0.5 mL/h.' },
    ],
  },
  'pump-motor': {
    id: 'pump-motor',
    name: 'Pump Motor',
    status: 'approved',
    currentValue: 'Speed limit: 120 RPM',
    approvedValue: 'Speed limit: 120 RPM',
    confidence: 97,
    conclusion: 'The pump-motor speed limit matches the approved design baseline.',
    recommendation: 'No action required.',
    evidence: [
      { source: 'GitHub', reference: 'motor/limits.ts', summary: 'Current speed limit is 120 RPM.' },
      { source: 'Drive', reference: 'Motor Verification MV-11', summary: 'Approved speed limit is 120 RPM.' },
    ],
  },
  'battery-module': {
    id: 'battery-module',
    name: 'Battery Module',
    status: 'unreviewed',
    currentValue: 'Pack revision: B',
    approvedValue: 'No approved value recorded',
    confidence: 42,
    conclusion: 'The battery-module revision has not yet been reviewed across the available systems.',
    recommendation: 'Schedule a battery-module design review and attach the approval record.',
    evidence: [
      { source: 'GitHub', reference: 'power/battery.ts', summary: 'Current build identifies pack revision B.' },
    ],
  },
};
