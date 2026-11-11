# Working together on Stella Zhang

Repository: https://github.com/jacqueathon/Stella-Zhang

## Shared approach
Use personal accounts, one shared repository, and a branch for each task. The main branch holds reviewed, integrated work. Work on task branches can be pushed early for backup and collaboration; it reaches main through a pull request.

AGENTS.md defines the AI workflow. Point every assistant to that file at the start of each session. This document supplies practical examples. The instructions describe desired behavior; repository protection and automated checks must be configured separately by the team.

## First-time setup
1. Accept the collaborator invitation with your own GitHub account.
2. Sign in to your Git client or coding environment with that account.
3. Clone once into a new, appropriate workspace location:

    git clone https://github.com/jacqueathon/Stella-Zhang.git
    cd Stella-Zhang

4. Check repository and identity:

    git remote -v
    git config user.name
    git config user.email

If identity is missing or incorrect, set it for this repository using your actual name and GitHub-verified email (or your GitHub-provided no-reply address). Do not copy another teammate's identity or change global identity as part of project setup.

Authorize your AI's GitHub connection separately if it needs one. Account collaboration access, app authorization, and local Git authentication are separate. Do not share login credentials.

## Start a new task
The commands below are conditional examples, not a script to run blindly. Inspect local work first:

    git status --short --branch
    git diff
    git diff --cached
    git fetch origin
    git log --oneline -8 origin/main

Inspect untracked files listed by status as well. Fetch can run while files are modified because it does not merge into them. Branch switching and integration need extra care.

Once the working tree is clean or safely checkpointed, create a new task branch from the fetched main:

    git switch -c brian/task-name origin/main

Use your own name and a short task description. If the branch already exists, inspect it and resume it instead of resetting or replacing it.

## Resume unfinished work
- Stay on the existing task branch.
- Fetch and compare both origin/main and the remote version of your task branch, if present.
- Save local edits before integrating. Review the staged selection; keep unrelated changes separate.
- A local checkpoint commit can preserve reviewed changes. If you use a named stash, include needed untracked files and restore it explicitly after integration.
- A stash and a local commit are only on that machine until separately backed up. Never drop a stash before checking restoration, and never push secret-bearing work.
- Merge incoming commits from the remote task branch first if someone else updated it. Then merge origin/main when needed.
- Read the resulting diff and validate the combined behavior.

With the correct task branch checked out and a clean working tree, the main integration command is:

    git merge origin/main

Running only git pull on a task branch normally follows that branch's configured upstream; it is not a guarantee that main has been integrated.

## What happens when two people edit the same file?
Non-overlapping changes may merge automatically. Overlapping changes can create a conflict. Read the base version, each side, and the intended behavior; then combine the changes deliberately. Check for conflict markers and run relevant validation. Ask the task owner when the conflict reflects incompatible product decisions.

Do not solve conflicts by replacing the whole project with a ZIP, selecting one side wholesale, or force-pushing. Preserve existing work before starting integrations.

## Naming updates
Each contributor has their own sequence:

| Checkpoint label | Meaning |
| --- | --- |
| Brian Version 1 - Add team instructions | Brian's first published checkpoint |
| Brian Version 2 - Add project setup | Brian's next published checkpoint |
| Teammate Version 1 - Add data import | Another person's independent sequence |
| Project v1 | Optional team release, assigned separately after integration |

The names are examples, not versions already published. Check fetched/local history before allocating a number. Coordinate if the same contributor has multiple sessions active. No shared counter file is needed. Record the branch and full or short commit hash with each published checkpoint.

A push can carry multiple commits. Give the final substantive commit the checkpoint title; earlier commits may have descriptive titles. Do not create empty changes or rewrite shared history just to attach a number. The commit hash, not the friendly number, identifies exact code.

## Finish your task
1. Inspect changed and untracked files. Stage specific intended files.
2. Run the project's relevant checks and inspect the resulting changes.
3. Add or update a task-specific handoff when useful.
4. Fetch again and integrate new remote work if needed. Validate the integration.
5. Use your next checkpoint label and commit.
6. When publishing is authorized, push the task branch:

    git push -u origin brian/task-name

7. Open or update a pull request targeting main. Use the supplied template, or a draft pull request if incomplete.
8. Have a teammate review. After approval, an authorized team member merges it.
9. Other teammates fetch the updated main before beginning their next task.

Do not auto-merge just because a push succeeded. Record the result as local only, pushed, PR open, or merged.

## Shared context
- Keep setup commands and architecture decisions in the project README/docs as they become known.
- Put task handoffs in docs/team/handoffs/contributor-task.md. Avoid one shared handoff file that everyone edits.
- Mention dependencies on other task branches in the pull request. Do not assume unfinished branches are already part of main.
- Do not copy private chat transcripts or credentials into shared documents.

## Owner setup checklist
The repository owner should configure main to require a pull request and one approving teammate, and block force-pushes/deletion where available. Add required automated checks once the project has a real test/build setup. Keep protections aligned with the team's agreed workflow.

## References
- GitHub flow: https://docs.github.com/en/get-started/using-github/github-flow
- Git fetch: https://git-scm.com/docs/git-fetch
- Git merge: https://git-scm.com/docs/git-merge
- Git stash: https://git-scm.com/docs/git-stash
