import type { ComponentResult } from '../../shared/types.js';

export const DEMO_COMPONENTS: ComponentResult[] = [
	{
		component_id: 'flow_controller_01',
		component_name: 'Flow Controller',
		status: 'matches_design',
		reviewed_value: '12.0 mL/hr',
		implemented_value: '12.0 mL/hr',
		confidence: 0.98,
		drive_evidence: 'Reviewed delivery profile specifies a nominal rate of 12.0 mL/hr.',
		slack_evidence: 'Bench team confirmed the production calibration remains at 12.0 mL/hr.',
		linear_evidence: 'FC-118 calibration verification completed and approved.',
		github_evidence: 'NOMINAL_FLOW_RATE_ML_HR = 12.0',
		conclusion: '',
		recommended_action: '',
	},
	{
		component_id: 'occlusion_sensor_01',
		component_name: 'Occlusion Sensor',
		status: 'verification_incomplete',
		reviewed_value: '300 mmHg',
		implemented_value: '400 mmHg',
		confidence: 0.82,
		drive_evidence: 'Reviewed occlusion alarm threshold is 300 mmHg.',
		slack_evidence:
			'Engineers reported repeated false alarms during bench testing and proposed increasing the threshold to 400 mmHg.',
		linear_evidence:
			"Change-assessment task 'Evaluate occlusion threshold increase to 400 mmHg' is marked Done.",
		github_evidence: 'OCCLUSION_THRESHOLD = 400',
		conclusion: '',
		recommended_action: '',
	},
	{
		component_id: 'controller_01',
		component_name: 'Motor Controller',
		status: 'unreviewed_drift',
		reviewed_value: '5 seconds',
		implemented_value: '7 seconds',
		confidence: 0.96,
		drive_evidence: 'Reviewed motor timeout is 5 seconds.',
		slack_evidence: null,
		linear_evidence: null,
		github_evidence: 'MOTOR_TIMEOUT_SECONDS = 7',
		conclusion: '',
		recommended_action: '',
	},
	{
		component_id: 'battery_monitor_01',
		component_name: 'Battery Monitor',
		status: 'insufficient_evidence',
		reviewed_value: '20% reserve',
		implemented_value: null,
		confidence: 0.44,
		drive_evidence: 'Design input calls for a low-battery alert at 20% reserve.',
		slack_evidence: null,
		linear_evidence: 'BM-42 references a firmware adjustment but has no linked change record.',
		github_evidence: null,
		conclusion: '',
		recommended_action: '',
	},
];

export function findDemoComponent(input: string): ComponentResult | null {
	const normalized = input.trim().toLowerCase();
	return (
		DEMO_COMPONENTS.find(
			(component) =>
				component.component_id.toLowerCase() === normalized ||
				component.component_name.toLowerCase() === normalized,
		) ?? null
	);
}
