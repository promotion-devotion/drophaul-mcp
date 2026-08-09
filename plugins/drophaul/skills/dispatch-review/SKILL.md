---
name: dispatch-review
description: Review a DropHaul service date for unassigned jobs, route conflicts, fleet readiness, and driver coverage before any dispatch change. Use when a dispatcher, owner, or admin asks for a dispatch-board review, morning readiness check, assignment proposal, or auto-dispatch run.
---

# Dispatch Review

Default to a read-only readiness report. Keep the report and any execution visibly separate.

## Workflow

1. Call `whoami`, resolve one explicit date, and state the selected company.
2. Call `get_schedule`, `list_jobs`, and `list_routes` for that date. Use `get_job` or `get_route` only for records that need detail.
3. Check `list_trucks`, `list_trailers`, `list_driver_absences`, `list_maintenance_due`, and `get_weather` when they affect readiness.
4. Report unassigned work, route overlap, missing equipment, absent drivers, maintenance conflicts, tight site windows, and priority jobs. Use public display IDs.
5. If the user asks for an assignment proposal, state the exact date and jobs first, then call `auto_dispatch`. It spends the org's optimization credits through an external provider, so it cannot be planned into a `plan_changes` batch and cannot be undone once dispatched.
6. `auto_dispatch` collects its own confirmation: the host raises a prompt naming that call, and only an explicit yes releases the provider call. Never construct or edit confirmation state. A host that cannot prompt is refused outright, so no prompt means nothing dispatched.
7. Report every driver and route change it made plus every job left unassigned. An approval covers that one call only; a changed date or job set needs a fresh call and a fresh yes.

## Manual changes

- Treat `assign_job`, `add_jobs_to_route`, `reorder_route`, and `reschedule_job` as separate writes. State the exact record and change before each approval.
- Use one idempotency key per approved intent and reuse it only for a retry of the same call.
- Do not dispatch, complete, cancel, or message on the user's behalf during a review.
- End with a readiness verdict, unresolved blockers, and the next human decision.
