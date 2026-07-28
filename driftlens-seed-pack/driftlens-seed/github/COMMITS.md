# Demo commit history — Infusion Pump firmware

## Commit 58c1aa0 (2026-07-10)
Component: baseline docs sync  
Message: "Align comments with DRS-REV-B-001 reviewed values (5s / 300 mmHg)"

## Commit 7e4b901 (2026-07-12)
Component: occlusion_sensor_01  
Change: logging only  
Message: "Add occlusion alarm telemetry hooks for bench false-alarm analysis"

## Commit 91aa220 (2026-07-18)
Component: occlusion_sensor_01  
Change: candidate branch config comment  
Message: "Document candidate verification value 400 mmHg (not baseline)"

## Commit a91f2c8 (2026-07-20)
Component: occlusion_sensor_01  
Change: alarm threshold 300 -> 400 mmHg  
Message: "Apply assessed occlusion threshold update for verification"

## Commit c0ffee1 (2026-07-20)
Component: occlusion_sensor_01  
Related: PR #88  
Message: "Expose OCCLUSION_THRESHOLD_MMHG through deviceConfig"

## Commit b72d9e1 (2026-07-21)
Component: controller_01  
Change: motor timeout 5 -> 7 seconds  
Message: "Temporary startup timeout workaround"

## Commit d41d8cd (2026-07-21)
Component: controller_01  
Related: PR #91  
Message: "Mark motorTimeoutSeconds=7 as temporary in code comments"

## Commit ee12ab9 (2026-07-23)
Component: both  
Message: "Add DriftLens component_id annotations to config exports"

## Commit f00d1a7 (2026-07-24)
Component: release tooling  
Message: "Add evidence dump script labels for controller_01 and occlusion_sensor_01"
