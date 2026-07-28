# Verification Protocol BP-CTRL-07 — Main Controller Timeout

Component: `controller_01`  
Reviewed timeout under test: 5 seconds

## Required evidence before any timeout change

1. Startup-fault injection series (n >= 30)
2. Stall-detection latency comparison vs 5-second baseline
3. Approved design-change assessment in Linear
4. Completed verification with Quality acknowledgement

## Current status (as of 2026-07-24)

- Temporary firmware workaround observed in GitHub (7 seconds)
- Investigation ticket closed without creating an approved design-change task
- No verification package exists for promoting 7 seconds into baseline
