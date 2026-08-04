---
name: dispatch-review
description: Review a DropHaul service date for unassigned jobs, route conflicts, fleet readiness, and driver coverage, then preview safe dispatch changes. Use when a dispatcher, owner, or admin asks for a dispatch-board review, morning readiness check, assignment proposal, or auto-dispatch preview.
---

# Dispatch Review

Default to a read-only readiness report. Keep preview and execution visibly separate.

## Workflow

1. Call `whoami`, resolve one explicit date, and state the selected company.
2. Call `get_schedule`, `list_jobs`, and `list_routes` for that date. Use `get_job` or `get_route` only for records that need detail.
3. Check `list_trucks`, `list_trailers`, `list_driver_absences`, `list_maintenance_due`, and `get_weather` when they affect readiness.
4. Report unassigned work, route overlap, missing equipment, absent drivers, maintenance conflicts, tight site windows, and priority jobs. Use public display IDs.
5. If the user asks for an assignment proposal, call `preview_auto_dispatch`. Explain every proposed driver and route change plus every job left unassigned.
6. Ask for explicit confirmation of that exact preview. Only then call `confirm_auto_dispatch` with the returned confirmation state. Never construct or edit confirmation state.
7. If the preview changed or expired, generate a new preview and ask again. A prior approval does not cover a new preview.

## Manual changes

- Treat `assign_job`, `add_jobs_to_route`, `reorder_route`, and `reschedule_job` as separate writes. State the exact record and change before each approval.
- Use one idempotency key per approved intent and reuse it only for a retry of the same call.
- Do not dispatch, complete, cancel, or message on the user's behalf during a review.
- End with a readiness verdict, unresolved blockers, and the next human decision.
