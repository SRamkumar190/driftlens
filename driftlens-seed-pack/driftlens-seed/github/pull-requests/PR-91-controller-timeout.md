# Pull Request #91 — Temporary controller timeout workaround

Component: `controller_01`  
Author: Lena Park  
Merged: 2026-07-21  
Linked Linear: MED-151 (Done investigation), MED-152 (Todo decision), MED-153 (Backlog assessment)

## Summary

Temporarily increases `MOTOR_TIMEOUT_SECONDS` from 5 to 7 to unblock startup testing.

## Explicit statements in PR description

- Temporary workaround only
- Not an approved design change
- Reviewed specification remains 5 seconds per DRS-REV-B-001
- Formal design-change assessment ticket was not created

## DriftLens expectation

`controller_01` should classify as `unreviewed_drift` when all sources are available.
