---
name: optimize-routes
description: Inspect DropHaul route constraints and optimization credits, submit an approved route or fleet optimization, poll it to completion, and explain the result. Use when a dispatcher, owner, or admin asks to shorten a route, balance a dated fleet, reorder stops, or diagnose why an optimization cannot run.
---

# Optimize Routes

Optimize only the records the user names or the single explicit service date they approve.

## Workflow

1. Call `whoami`. Confirm the selected company and that route optimization tools are available.
2. Call `get_optimization_usage` before proposing a paid run. If no credit is available, stop and explain the blocker.
3. For one route, call `get_route` and `get_route_directions`. For a dated fleet, call `list_routes`, then inspect each candidate route that affects the decision.
4. Summarize the current order, constraints, excluded or unassigned jobs, and the exact scope of the proposed run.
5. Ask for explicit approval before calling `optimize_route` or `optimize_fleet`. Do not treat a request to review as approval to spend a credit or alter route state.
6. Use a fresh idempotency key for the approved submission. Retain it for retries of that same submission only.
7. Poll `get_optimization_status` until the run succeeds or fails. Do not submit a second run while the first is pending.
8. Compare the returned plan with the prior route order and report distance, duration, assignment, and exception changes. Use public route and job display IDs.

## Guardrails

- Do not bypass time windows, capacity, driver schedules, site access, or unit requirements.
- Do not reorder manually after optimization unless the user explicitly approves a separate `reorder_route` operation.
- If the result drops a job or changes a driver, call that out before any follow-on dispatch action.
- Never claim savings the result does not return.
