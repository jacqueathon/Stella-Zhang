# Hydra Stack

**A student career planning workspace that connects opportunities, people and practical next steps.**

Hydra Stack helps students organize the work behind a career search: understanding their strengths, researching employers, finding relevant people, preparing conversations and following through. It brings those activities together with a personal to-do list so that an interesting opportunity can become a concrete action.

Developed by the **Stella Zhang team**, the project combines ideas and research from Zal Career Command, ATLAS.ai and Brian Uong's BDashh. The current version is an interactive browser-based demo with three fictional student workspaces.

[Open the live demo](https://hydrastack2.vercel.app/) · [Contribution guide](CONTRIBUTING.md) · [Source acknowledgements](THIRD-PARTY-NOTICES.md)

## Explore the demo

Choose a student on the landing page, review their profile and select **Show my recommendations**.

| Demo profile | Starting focus | Example skills |
| --- | --- | --- |
| Alex Rivera | Marketing & growth | Marketing, campaigns, Excel, customer insights |
| Maya Chen | Data & analytics | Python, SQL, Tableau, statistics |
| Jordan Brooks | Finance & business | Finance, Excel, forecasting, financial modelling |

Each profile has its own saved progress in the current browser. Use **Switch student profile** to explore a different path. Selecting a profile does not create an account.

A typical session:

1. **Set your direction.** Edit skills, career focus, preferred location and graduation month in **My profile**.
2. **Explore opportunities.** Review job suggestions and company evidence in **Jobs & companies**, then check original sources.
3. **Prepare a conversation.** Find a relevant contact in **My network**, personalize a draft and record a conversation plan.
4. **Choose your next action.** Save a lead, add a task with a deadline and decide what to work on today.
5. **Track what happened.** Update progress after taking action, complete tasks and export a copy of your workspace.

## What you can do

| Workspace area | Features |
| --- | --- |
| **For you** | See profile-based job suggestions, potential contacts, company insights, saved-opportunity and meeting counts, and the next three open tasks. |
| **Jobs & companies** | Search roles, filter by location or saved status, inspect skill overlap and eligibility notes, and save leads. The company tab presents ATLAS.ai assessments with source evidence, counterevidence, forecasts and suggested research steps. |
| **My network** | Explore priority contacts and LinkedIn links, edit and copy connection/follow-up drafts, browse event snapshots, and use mentorship preparation guidance. Create or edit personal conversation plans. |
| **To-do list** | Add, edit, complete, reopen or delete tasks. Set optional due dates and High/Medium/Low priorities; search titles; filter by Open, Today, All or Completed; and see overdue tasks and completion counts. |
| **My progress** | Organize saved jobs, people, companies and events into Saved, In progress, Waiting and Completed stages. Record next-step notes, self-reported referral status and conversation plans. Export progress as JSON. |
| **My profile** | Edit the demo student's background, goals, skills and availability. Paste résumé notes or import a plain-text résumé, and reset that profile when needed. |

Outreach drafts are prepared for you to review and copy. The app does not send messages, submit applications, register for events or book meetings.

## How it works

Hydra Stack is a static application. HTML, CSS, JavaScript modules and bundled research files are served to the browser, where the interface, matching rules and workspace state run. There is no application backend or cloud database in this repository.

### Profile-based matching

Job suggestions use transparent rules in [`dist/core.mjs`](dist/core.mjs). The ranking considers:

- Overlap between the profile's skills and a job's tags.
- Career-focus alignment and preferred region.
- Stated start timing and a role-specific graduation-window check where implemented.

The interface explains relevant skill overlaps and surfaces eligibility cautions. Rankings are a starting point for research, not a hiring probability or comprehensive eligibility assessment. Changing skills and career focus changes the suggestions; experience and résumé notes are retained for reference rather than parsed for matching.

Suggested contacts prioritize employers appearing among the student's top-ranked roles. Connection and follow-up drafts use templates populated from the selected profile and contact information. No live language model or paid AI API is called by the app.

### Company insights and research

[`dist/data.mjs`](dist/data.mjs) contains the demo profiles and attributed job, recruiter and event snapshots. [`dist/atlas-data.json`](dist/atlas-data.json) contains the archived ATLAS.ai C05 company research, loaded by the browser.

Company detail views bring together assessments, supporting evidence, counterevidence and recorded forecasts. The original ATLAS reference profile is shown in the interface; those archived assessments are not recalculated for the selected student.

These datasets are bundled with the app, not refreshed from live job boards. Check each record's source and date before relying on a vacancy, event, recruiter role, sponsorship statement or forecast. Reloading the page does not perform new research.

### Tasks and saved progress

Workspace state contains the profile, saved leads, conversation plans, outreach drafts, tasks and onboarding status. Changes are stored in `localStorage` under a separate key for each persona, such as `hydra-stack-demo-v1:alex`.

- Tasks are ordered with open items first, then by due date and priority. Undated tasks follow dated ones. Today and overdue labels use the device's local calendar.
- Existing workspaces without tasks start with an empty task list while keeping their other progress.
- **Export progress** downloads the active profile's state as JSON, including tasks. The demo currently has no JSON restore/import screen.
- **Reset this demo profile** clears that profile's edits and progress after confirmation; the other profiles remain unchanged.
- If browser storage cannot be written, changes remain in memory for that session and the app displays a warning to export before closing.

Storage belongs to the browser and site address. A local preview, the Vercel demo and a separate ChatGPT Site do not share progress. Clearing site data or changing browsers/devices can make saved work unavailable. The demo profiles are not authenticated accounts, and their storage is not a privacy boundary on a shared browser.

## Technology and repository layout

The app uses native browser APIs and ES modules, with no frontend framework, package installation or compilation step. Node.js runs the automated tests; Python is one option for serving the static files locally.

| File or directory | Responsibility |
| --- | --- |
| [`dist/index.html`](dist/index.html) | Page entry point, metadata, stylesheet and module loading. |
| [`dist/app.mjs`](dist/app.mjs) | Navigation, page rendering, dialogs, event handling, profile persistence and exports. |
| [`dist/core.mjs`](dist/core.mjs) | Matching, eligibility notes, draft templates, state helpers and text/URL safeguards. |
| [`dist/tasks.mjs`](dist/tasks.mjs) | Task validation, normalization, updates, filtering, sorting and counts. |
| [`dist/tasks-view.mjs`](dist/tasks-view.mjs) | To-do page, task rows, edit form and home dashboard preview. |
| [`dist/data.mjs`](dist/data.mjs) and [`dist/atlas-data.json`](dist/atlas-data.json) | Bundled demo data and attributed research snapshots. |
| [`dist/style.css`](dist/style.css) | Shared visual design and responsive layouts. |
| [`dist/company-logos.mjs`](dist/company-logos.mjs) | Employer-domain logo mapping and initials fallback. |
| [`tests/`](tests/) | Node tests for core behavior and task management. |
| [`docs/team/`](docs/team/) | Shared AI session prompts, handoff template and task handoffs. |

Despite the directory name, **`dist/` is the maintained application source as well as the deployable static site**. Edit these files directly. Do not expect a build command to regenerate them.

## Run locally

Prerequisites: Git, Python 3 for the example server, and Node.js 22+ to run tests.

```bash
git clone https://github.com/jacqueathon/Stella-Zhang.git
cd Stella-Zhang
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). On Windows, use `py -m http.server 8000 --directory dist` if `python3` is unavailable. Any equivalent static HTTP server can serve `dist/`.

Use an HTTP server rather than opening `index.html` as a file: the application loads JavaScript modules and fetches the company research JSON. No API keys or environment variables are needed.

### Validation

From the repository root:

```bash
node --check dist/app.mjs
node --check dist/tasks.mjs
node --check dist/tasks-view.mjs
node --test tests/*.test.mjs
```

The tests cover profile separation, recommendation behavior, eligibility boundaries, text/URL safeguards, storage warnings and task lifecycle, persistence, validation, filtering and rendering. Automated checks do not replace a browser review of the affected pages.

For UI changes, also check the relevant flows in a browser: profile switching, saving and reloading progress, search/filter controls, task editing and completion, and narrow-screen navigation.

## Deployment

The team demo is hosted at [hydrastack2.vercel.app](https://hydrastack2.vercel.app/). To deploy this repository as a static site on Vercel, use the project's existing configuration:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Build command | Empty |
| Install command | Empty |
| Output directory | `dist` |
| Environment variables | None required |

A connected Vercel project controls which Git branch triggers deployment. Pushing a task branch does not merge it into `main`. Publish only `dist/` as website assets.

A ChatGPT Sites copy is a separate publication. GitHub changes do not automatically update it; it must be synced and published separately.

## Current scope

This is a working product demo, not a production service. It currently has no real user authentication, shared team database, cross-device sync, live feed updater, AI provider integration, PDF/résumé parsing, calendar integration or scheduled reminders.

Résumé import accepts plain-text `.txt` files for reference. Meeting plans and referral statuses are records entered by the user; they do not verify a booking or referral. Public contact records do not establish mentorship availability or hiring authority. Avoid entering sensitive personal records into demo profiles.

Fonts are loaded from Google Fonts, and mapped employer marks use Google's favicon service with an initials fallback. Source and LinkedIn links open external websites. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for attribution and usage context.

## Contributing as a team

The canonical repository is [jacqueathon/Stella-Zhang](https://github.com/jacqueathon/Stella-Zhang). Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before starting a session.

1. Inspect local changes and fetch the latest remote work; preserve unfinished edits before integrating updates.
2. Work on one task branch, such as `brian/task-name`, based on the latest `main`.
3. Make focused changes, run relevant checks and record a task handoff.
4. Use the next verified contributor checkpoint label, such as `Name Version N - Short description`.
5. Push the task branch and open a pull request for teammate review. An authorized team member merges after approval.

The repository holds shared context; teammates' assistants do not automatically share chat history, credentials or local changes.

- [Start an AI session](docs/team/AI-START-PROMPT.txt)
- [Finish an AI session](docs/team/AI-FINISH-PROMPT.txt)
- [Handoff template](docs/team/HANDOFF-TEMPLATE.md)
- [Task handoffs](docs/team/handoffs/)
- [Pull request template](.github/pull_request_template.md)

## Acknowledgements

Hydra Stack draws on Zal Career Command and ATLAS.ai source supplied by Shaun, and public BDashh job/recruiter research from Brian Uong. Private original archives, credentials, personal tailoring and backend records are excluded from this repository. Employer and research-source links remain attributed in the bundled data.

See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the full source acknowledgements and licensing context.
