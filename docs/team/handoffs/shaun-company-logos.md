# Company logos
Contributor: Shaun / xzacutionar
Branch: shaun/company-logos
Checkpoint: Shaun Version 2 - Add employer logos to job and company cards
Base: ae080acc22a532d05cc4bf7709af524430407513
Commit: see pull request.

Added employer domain mappings, compact favicon marks on job/company cards and detail panels, and initials fallback. Joint UCI / Habitat OC keeps a neutral mark. Existing blue branding and the merged eggplant logo from main are preserved. Logos load through Google's favicon service; no provider credentials or private records required.

Validation: nine existing Node tests pass, module syntax checked, job-domain coverage and image-error fallback checked. Browser preview showed job logos and all 15 mapped company images loaded. The joint record remains initials. No role, sponsorship, profile or research content changed.

Public ChatGPT Site publication is separate from GitHub. Task branch awaits teammate review and merge; no main merge or Vercel deployment performed. Exact commit is in the PR. No unfinished local work or conflicts.
