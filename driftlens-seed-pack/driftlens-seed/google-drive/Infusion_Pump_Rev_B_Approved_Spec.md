# Infusion Pump Revision B — Reviewed Design Specification

Document ID: DRS-REV-B-001  
Device: Infusion Pump Revision B  
Document Owner: Quality Systems  
Review Status: Approved for prototype verification  
Reviewed On: 2026-07-10  
Approvers: Priya Nair (Systems), Omar Haddad (Firmware), Elena Voss (Quality)

## 1. Scope

This specification defines the reviewed design baseline for Infusion Pump Revision B
prototype verification. Any deviation from the values below requires change control.

## 2. Component: Main Controller

Component ID: `controller_01`  
Display Name: Main Controller  
Approved motor timeout: **5 seconds**  
Configuration key: `MOTOR_TIMEOUT_SECONDS`  
Rationale: A timeout longer than 5 seconds may delay fault detection during motor stall
or startup fault conditions.  
Safety class: Safety-related control parameter  
Verified against: Bench protocol BP-CTRL-07

## 3. Component: Occlusion Sensor

Component ID: `occlusion_sensor_01`  
Display Name: Occlusion Sensor  
Approved alarm threshold: **300 mmHg**  
Configuration key: `OCCLUSION_THRESHOLD_MMHG`  
Rationale: Threshold selected to detect line blockage while limiting false alarms during
normal infusion pressure variation.  
Safety class: Safety-related alarm parameter  
Verified against: Bench protocol BP-OCC-12

## 4. Change-control rule

Any change to a safety-related threshold or timeout requires:

1. documented engineering rationale;
2. approved change-assessment task;
3. completed verification evidence;
4. Quality acknowledgement before promotion to device baseline.

## 5. Related documents

- DRS-REV-A-014 (superseded values retained for history)
- RISK-IFP-B-022 Occlusion and motor-stall hazard analysis
- MIN-2026-07-10 Design review minutes
