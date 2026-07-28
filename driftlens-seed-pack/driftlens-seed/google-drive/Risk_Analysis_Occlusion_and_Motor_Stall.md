# Risk Analysis Excerpt — Occlusion & Motor Stall

Document ID: RISK-IFP-B-022  
Linked components: `controller_01`, `occlusion_sensor_01`  
Owner: Elena Voss (Quality)

## Hazard: Undetected motor stall

- Control: motor timeout at reviewed value of 5 seconds (`controller_01`)
- Residual risk after control: Acceptable for prototype verification
- Note: Increasing timeout without verification may delay stall detection.

## Hazard: Missed or delayed occlusion alarm

- Control: occlusion threshold at reviewed value of 300 mmHg (`occlusion_sensor_01`)
- Residual risk after control: Acceptable with known false-alarm tradeoff
- Note: Raising threshold may reduce nuisance alarms but can delay true occlusion detection.
  Verification evidence is mandatory before baseline change.

## Review implication

DriftLens should flag any implementation values that differ from the reviewed controls above
and present evidence for human engineering and quality review.
