# Hydra Stack
A working student career demo built from Zal Career Command and public BDashh research, with ATLAS.ai company insights.
https://hydrastack2.vercel.app/

## Run
Node.js 22+ for tests. Python 3 for a local static server.
```
node --test tests/*.test.mjs
python3 -m http.server 8000 --directory dist
```
Open http://localhost:8000. No install or build step required. Deploy only `dist/`.

## Product flow
Select Alex (marketing), Maya (data) or Jordan (finance). Review the editable profile, explore suggestions, save roles/people/company insights/events, draft outreach, record meeting plans and update progress. These three fictional personas are browser-local demo workspaces, not secure user accounts. Switch profiles using the top-right control.

## Source boundaries
- `dist/` is the new app. `data.mjs` contains attributed research snapshots, not live jobs. `atlas-data.json` retains the C05 dated research from Zal's student-facing build.
- Original private Zal source archives and internal research are excluded from this public repository. The complete Hydra app and its student-facing Atlas snapshot are included.
- Public BDashh research is attributed in the app. Personal tailoring and the original raw reference archive are excluded; current job availability is never assumed.
- Data provenance and limitations are visible in the interface. A profile is not proof of a referral offer or available mentor.

## Limitations
No real authentication, cloud database, paid AI, résumé parsing, outreach sending, applications, calendars or live feed writer. Local storage is namespaced per persona but is not a security boundary. Do not use sensitive personal records in a shared browser. Skills and focus drive deterministic matching; résumé text is for reference only. Source links must be checked before relying on any vacancy or eligibility statement. Existing scheduled research tasks do not transfer automatically.

## Team development
This repository contains Hydra Stack for the Stella Zhang team. Edit files in `dist/`, run the tests, and preview locally before committing. Changes here do not automatically update the separate ChatGPT Sites publication.

## Vercel setup
Import this GitHub repository, choose the Other framework preset, leave build and install commands empty, and set the output directory to `dist`. No environment variables are required for this static demo. A Vercel project must be connected separately before GitHub commits trigger deployments.

## Shared team workflow
Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before each session. Use a task branch, a contributor checkpoint label, and a pull request for teammate review.

- [Start an AI session](docs/team/AI-START-PROMPT.txt)
- [Finish an AI session](docs/team/AI-FINISH-PROMPT.txt)
- [Handoff template](docs/team/HANDOFF-TEMPLATE.md)

The team kit defines collaboration, not automatic synchronisation. The existing Hydra Stack architecture and test commands above remain authoritative.
