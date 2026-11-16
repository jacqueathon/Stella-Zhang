# Shaun: Company intelligence view

Branch: shaun/company-intel. Base: 62b01a4. Checkpoint: Shaun Version 4.

Replaces Company Insights cards and text-only company dialogs with a full-page ATLAS workspace inspired by Zal's Intel page: company picker, chronological clickable evidence milestones, research coverage bars, predictions with counterevidence, year-grouped history, next steps and source dossier accordions. Existing company links open the workspace. Existing follow-company and profile-specific progress are retained. Keyboard tabs support arrows/Home/End.

No data refresh or private archive import. The existing C05 snapshot remains dated 10 November 2026; the original dashboard is now C06. Graphs count retained evidence records, not jobs or hiring probabilities. Hiring history is limited to evidence already in the team repository.

Preserved Brian's tasks and Garry's branding. No dependency or build step added. Files: dist/intel.mjs, dist/intel.css, app import/event integration, index stylesheet, tests/intel.test.mjs.

Validation: node --check dist/app.mjs; node --check dist/intel.mjs; node --test tests/*.test.mjs (23 passed). Browser preview is pending because connected and cloud browsers cannot access workspace localhost. Review desktop and mobile layout in Vercel preview before merging.

Publication: task branch for teammate review; not merged. No conflicts. Commit hash recorded in PR.
