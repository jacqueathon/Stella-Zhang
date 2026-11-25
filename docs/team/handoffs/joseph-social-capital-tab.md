# Task handoff: Social Capital tab

- Contributor / GitHub username: Joseph
- Task branch: joseph/social-capital-tab
- Latest main commit integrated: 2413bd6
- Checkpoint label: Joseph Version 1
- Checkpoint commit: see pull request/session message
- Pull request: draft, see session message
- Status: pushed

## Goal
Add a "Social Capital" sub-tab under My network that turns a LinkedIn connections export into an industry reach map, hiring-power view and per-company access for the student's ranked roles, in the existing Hydra Stack design.

## Completed
- dist/social-capital.mjs: CSV parsing, industry and seniority classification, concentration and access scoring, demo network (all invented people).
- dist/zip.mjs: reads .csv, .zip (nested, ZIP64), .gz in the browser.
- dist/social-capital-view.mjs and social-capital.css: native components (.stats, .panel, .card, .notice, .pill, .person-row).
- dist/app.mjs: new tab, click and file handlers. dist/index.html: stylesheet link.
- tests/social-capital.test.mjs (7 tests), README row.

## Decisions
- Uploaded data is kept in memory only, never in localStorage, because it is private contact data. A refresh clears it.
- Industries are estimated from company names; LinkedIn's export has no industry or photo columns.
- No new dependencies; no backend.

## Validation
- node --test tests/*.mjs: 32 pass, 0 fail.
- Local static server plus Chrome screenshots of the empty, sample and 390px states; no page errors.
- Not run: no lint or build step exists in the repo.

## Remaining work
- Optional: persist consent-based saved summaries (not raw contacts); photo matching from the export images.

## Conflicts or questions
- Checkpoint number and commit identity were not assigned; confirm "Joseph Version 1" is right.

## Local work
None outstanding.
