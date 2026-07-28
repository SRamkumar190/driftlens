// DriftLens demo seed
// Device: Infusion Pump Revision B
// NOTE: Values below are current implementation values, not proof of design approval.

/**
 * Reviewed design baseline (DRS-REV-B-001):
 * - controller_01 MOTOR_TIMEOUT_SECONDS = 5
 * - occlusion_sensor_01 OCCLUSION_THRESHOLD_MMHG = 300
 *
 * Current working-tree values may differ and require human review.
 */
export const deviceConfig = {
  controller_01: {
    // TEMPORARY WORKAROUND (see commit b72d9e1 / PR #91)
    // Reviewed value remains 5 seconds. No approved design-change ticket exists.
    motorTimeoutSeconds: 7,
  },
  occlusion_sensor_01: {
    // Candidate verification value after MED-142 assessment.
    // MED-143 verification is still incomplete — not a promoted baseline.
    alarmThresholdMmHg: 400,
  },
};

export const MOTOR_TIMEOUT_SECONDS = deviceConfig.controller_01.motorTimeoutSeconds;
export const OCCLUSION_THRESHOLD_MMHG =
  deviceConfig.occlusion_sensor_01.alarmThresholdMmHg;
