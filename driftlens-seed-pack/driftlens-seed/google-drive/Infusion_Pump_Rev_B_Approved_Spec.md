# Infusion Pump Revision B — Reviewed Design Specification

Document ID: DRS-REV-B-001
Device: Infusion Pump Revision B
Review Status: Approved for prototype verification
Reviewed On: 2026-07-10

## Component: Main Controller
Component ID: controller_01
Approved motor timeout: 5 seconds
Rationale: A timeout longer than 5 seconds may delay fault detection.

## Component: Occlusion Sensor
Component ID: occlusion_sensor_01
Approved alarm threshold: 300 mmHg
Rationale: Threshold selected to detect line blockage while limiting false alarms.

## Change-control rule
Any change to a safety-related threshold requires:
1. documented engineering rationale;
2. approved change-assessment task;
3. completed verification evidence.
