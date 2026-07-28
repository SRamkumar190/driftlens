# Infusion Pump Revision A — Historical Spec (Superseded)

Document ID: DRS-REV-A-014  
Status: Superseded by DRS-REV-B-001 on 2026-07-10  
Retained for audit trail only

## Historical values

| Component ID | Parameter | Rev A value | Notes |
|---|---|---|---|
| controller_01 | motor timeout | 4 seconds | Increased to 5s in Rev B after false stall trips |
| occlusion_sensor_01 | alarm threshold | 250 mmHg | Increased to 300 mmHg in Rev B for false-alarm reduction |

## Relevance to DriftLens review

Rev B remains the only approved baseline. Current firmware values must be compared to
DRS-REV-B-001, not this superseded document.
