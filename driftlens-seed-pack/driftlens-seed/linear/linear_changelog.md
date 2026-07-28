# Linear changelog (project Med Device Validation)

2026-07-18 — MED-142 created (Change Assessment) for occlusion_sensor_01 300->400 mmHg  
2026-07-18 — MED-143 created (Verification) linked to MED-142  
2026-07-19 — MED-142 moved to Done  
2026-07-20 — MED-143 progress note: 12/20 occlusion injections complete  
2026-07-21 — MED-151 created for controller_01 startup timeout investigation  
2026-07-22 — MED-151 closed after temporary workaround; no design-change child ticket opened  
2026-07-23 — MED-152 opened as follow-up decision for controller_01 7s workaround  
2026-07-24 — MED-143 remains In Progress; MED-144 Quality gate remains Todo  

Implication for DriftLens:
- occlusion_sensor_01 => verification_incomplete (assessment exists, verification incomplete)
- controller_01 => unreviewed_drift (implementation changed, no approved design-change task)
