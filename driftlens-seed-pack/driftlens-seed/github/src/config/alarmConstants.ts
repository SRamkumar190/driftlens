// Alarm constants derived from deviceConfig.
// Component IDs are intentional for DriftLens evidence correlation.

import {
  MOTOR_TIMEOUT_SECONDS,
  OCCLUSION_THRESHOLD_MMHG,
} from "./deviceConfig";

export const alarmConstants = {
  controller_01: {
    key: "MOTOR_TIMEOUT_SECONDS",
    implemented_value: MOTOR_TIMEOUT_SECONDS,
    unit: "seconds",
  },
  occlusion_sensor_01: {
    key: "OCCLUSION_THRESHOLD_MMHG",
    implemented_value: OCCLUSION_THRESHOLD_MMHG,
    unit: "mmHg",
  },
} as const;
