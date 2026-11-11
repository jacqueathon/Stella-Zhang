# Task handoff: shared AI team instructions

- Contributor / GitHub username: Shaun / xzacutionar
- Task branch: shaun/team-instructions
- Latest main commit integrated: 1bbaad31c3f82f174a1d5ef61f783d09047d3c08
- Checkpoint label: Shaun Version 1 - Add shared AI team workflow
- Checkpoint commit: see pull request/session message
- Publication: task branch and pull request; main requires teammate review.

## Completed
Installed the six repo-files from Stella-Zhang-AI-Team-Kit-v1.zip unchanged, preserved the existing README and added workflow links. Preserved all application, research snapshot and test files.

## Decisions
Used GitHub API task-branch operations with observed base commit and guarded ref update; no local Git identity or global configuration changed. The existing application is a static HTML/CSS/ES-module demo with Node tests. Kit statements that the stack is not established do not replace the README.

## Validation
`node --test tests/*.test.mjs`: nine tests passed. Checked all six kit files byte-for-byte, README local links, and original application file hashes. Full current remote branch/history inspection found only main and two commits, with no previous Shaun checkpoint labels.

## Remaining work
A teammate reviews and an authorised team member merges the pull request. Repository protections and Vercel deployment are separate tasks; neither is configured by this update.

## Conflicts or questions
None. No application behaviour changed.

## Local work
Prior working directories were preserved. No stashes, secrets or private chat transcripts included.
