---
name: plan-my-day
description: Build a role-aware daily operating plan from DropHaul schedules, routes, weather, notifications, and current identity. Use when a dispatcher, driver, technician, owner, or admin asks what to do today, requests a morning briefing, or needs conflicts and priorities summarized before work begins.
---

# Plan My Day

Create a concise briefing from live, role-visible data. Do not infer records or widen access when a tool is absent.

## Workflow

1. Call `whoami` first. State the selected company and roles; stop if they do not match the user's intent.
2. Resolve the requested date explicitly. Ask once if the date or local timezone is ambiguous.
3. Call `get_weather`, then `get_schedule`. For drivers, also call `get_my_route`; for dispatch-capable users, use `list_routes` only when route context is needed.
4. Call `list_notifications` for urgent operational alerts. Do not mark them read unless the user separately asks.
5. Group the result into: must happen, route or timing risks, customer/site constraints, and lower-priority follow-up. Cite public display IDs so the user can find each record.
6. Point out missing assignments, schedule collisions, severe weather, access-window pressure, and maintenance or inventory blockers shown by the returned data.

## Safety

- Keep this workflow read-only. Propose changes, but do not assign, reschedule, message, dispatch, or update records.
- Never expose internal IDs, credentials, private notes unrelated to the task, or data from another company.
- Say when data is missing or stale. Do not turn an estimate into a confirmed time.
- End with the top three next actions and any question that must be answered before work starts.
