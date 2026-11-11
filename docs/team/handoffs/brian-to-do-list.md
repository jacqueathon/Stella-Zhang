# Personal to-do list

- Contributor: Brian / Brian-Uong
- Branch: brian/to-do-list
- Checkpoint: Brian Version 1 - Add dashboard to-do list
- Base main: 13b22dfa9bd02fe082ac13cf91ed42288cf3feff
- Commit: recorded in the pull request and session reply.

## Behavior

Added a To-do list workspace page and a next-three-tasks preview on For you. Users can add, edit, complete/reopen and delete tasks, with optional due dates and High/Medium/Low priorities. Open/Today/All/Completed filters, title search, overdue indicators and completion counts help plan the next step. Dates use the device's local calendar. Deletion has an in-app confirmation.

Tasks use the existing per-persona state and localStorage key. Existing workspaces migrate to an empty task list without changing leads, meetings or drafts. Malformed stored task entries are normalized. Export progress includes tasks, and the existing profile reset confirmation now explicitly mentions them. Storage failures retain a session-only notice. No new packages, server, paid service, notifications or team-sync database.

## Validation

Before the workstation disconnected, these commands passed:

- `node --check dist/app.mjs`
- `node --check dist/tasks.mjs`
- `node --check dist/tasks-view.mjs`
- `node --test tests/*.test.mjs` — 18 passed, 0 failed (9 existing, 9 task tests).

Tests cover persistence round-trips, profile isolation, legacy/malformed data, add/edit/complete/reopen/delete behavior, input/date validation, local date boundaries, filtering/counts/sorting, HTML escaping, empty states and unavailable-storage wording.

Browser verification could not be completed: localhost preview connections timed out, then the workstation connection closed. Desktop/mobile layout and end-to-end browser interactions need a reviewer check. Suggested review: add tasks with/without dates; edit; complete/reopen; filter/search; confirm/cancel deletion; reload; switch profiles; check For you and exported JSON. Check narrow mobile navigation and long task titles.

## Workflow and publication

No prior local checkout or unfinished work was present. Local Git cloning failed because network access was unavailable; current source and branch history were read through GitHub's API. All seven branch histories were checked before allocating Brian Version 1; branch heads were rechecked before publication. The API commit preserves untouched entries from the observed main tree. No competing changes or conflicts were found.

Publish only brian/to-do-list and open a pull request to main. Teammate review and an authorized merge remain the next step. Main and production deployment are not part of this task.
