# Stella Zhang — Shared AI Instructions

These are the team's collaboration defaults. Apply them within the user's authorized task and your platform's permissions. Be truthful about actions performed and access limits.

## Project identity and scope
- Canonical repository: https://github.com/jacqueathon/Stella-Zhang
- Remote name: normally origin; verify its URL before every session.
- Integration branch: main.
- The owner account hosts the repository. Contributors use their own accounts.
- Product requirements, stack, and validation commands are not established by this kit. Discover them in the repository or ask when needed; do not invent them.
- GitHub files and Git history hold shared project context. Teammates do not automatically share chat histories, local files, environment settings, or credentials.
- Follow this file, CONTRIBUTING.md, and applicable instructions in the directories you edit. Use the user's current request to define the task. If repository instructions conflict, explain the conflict instead of silently choosing destructive behavior.

## Start every session
1. Read this file and CONTRIBUTING.md. Inspect the README, relevant handoff, and code before editing.
2. Verify the working directory, origin URL, current branch, Git identity, and access. Do not change global Git configuration. Never invent a contributor's name or email.
3. Inspect status, staged and unstaged changes, untracked files, and any merge/rebase already in progress. Preserve existing work, including work you did not create.
4. Fetch current remote refs. Fetch updates remote-tracking information without integrating it into the working files. Check that the fetch succeeded and that the branches you need were fetched. If offline or denied, state that the latest version could not be verified.
5. Compare the current task branch with its remote counterpart and origin/main. Read relevant recent commits and any pull request before integrating changes.
6. Before switching branches or integrating updates, protect unfinished edits. Use a reviewed local checkpoint commit on the correct task branch, or a clearly named stash including relevant untracked files. Avoid bundling unrelated changes. Keep a stash until restoration is verified. Never publish a checkpoint containing secrets.
7. For a new task, start a new branch from the fetched origin/main. If resuming a task, stay on its existing branch; first reconcile any new commits on its remote branch, then merge origin/main as needed. Default to merging to preserve published history. Do not rebase a published/shared branch without explicit team agreement.
8. If a merge/rebase is already in progress, inspect and resolve or safely stop that operation before starting another. Do not automatically abort an operation someone else began.
9. Report briefly: task branch, fetched main's short commit hash, relevant incoming changes, whether local work was preserved, and any blocker.

Do not run an unconditional pull when the working copy or branch relationship has not been inspected. A branch pushed by a teammate is not automatically part of main. Integrate another task branch only when the task requires it and its owner/team agrees.

## While working
- Keep one task per branch. Format: contributor/task-name, for example brian/team-instructions.
- Make focused changes. Preserve unrelated files, unfinished features, and teammates' intent.
- Check relevant code and declared project commands before adding dependencies or choosing architecture.
- Do not commit credentials, API keys, .env secrets, personal machine configuration, or private data. Review untracked files and staged changes before committing.
- Do not use hard resets, destructive clean commands, blanket file restoration, branch deletion, or force-push to resolve routine sync problems.
- Git conflict resolution must preserve the intended combined behavior. Do not select all of one side or prefer the newest file solely because of its timestamp.
- Resolve clear mechanical conflicts and validate. If competing product decisions cannot be reconciled from available context, preserve both versions and ask the task owner to decide.
- After an integration, inspect the combined diff and check behavior. A clean text merge can still introduce a functional error.

## Contributor version labels
Each pushed work update must have a checkpoint commit titled:
    Name Version N - Short description
Example:
    Brian Version 1 - Add shared team instructions

- N is a positive counter for that contributor, not a global project counter.
- Before allocating N, inspect local and freshly fetched remote history for that contributor's checkpoint labels, including other task branches. Use the next unused number. If relevant history is shallow or unavailable, do not claim the number has been checked.
- Use one active numbering session per contributor. Parallel sessions using the same contributor name must coordinate numbers before publishing.
- Normal small commits can have descriptive messages. Use the final substantive commit in each pushed update as its named checkpoint. Do not create an empty change or rewrite published history solely to add a label.
- If a branch has only already-existing unlabeled commits, describe the limitation and record the label in the pull request/handoff; do not pretend a named checkpoint exists. Adopt the convention with the next substantive commit.
- Record branch and commit hash in the pull request or handoff. Hashes identify exact code; friendly counters are only navigation aids.
- Do not maintain a single shared counter file. Separate project release numbers are assigned by the team after integration; do not invent, increment, or publish releases during ordinary pushes.

## Finish and publish
1. Review the entire task diff and stage only intended files.
2. Run applicable checks that actually exist in the project. Record exact commands and outcomes. If no runnable code or checks exist, say so; never report invented passing tests.
3. Update a task-specific handoff if someone else may continue the work. Keep project decisions in repository docs, not only in chat.
4. Before an authorized push, fetch again, inspect remote changes, and integrate new commits from the task's remote branch and main as needed. Re-run affected checks if integration changed the result.
5. Use the next contributor checkpoint label and verify the staged content before committing.
6. Push only the intended task branch when the user has authorized publication. Open or update its pull request. Use draft status for incomplete work and report remaining limitations.
7. Do not merge into main, deploy, change repository permissions, or publish releases unless that action is authorized. Follow the team's review requirement and any enforced GitHub protections.
8. If a push is rejected because the remote moved, fetch and inspect the new changes, combine them safely, validate, and retry a normal push. Do not force-push.
9. Verify the remote branch/pull request result. State separately what is saved locally, pushed remotely, and merged into main.

## Required session handoff
Report contributor, task branch, checkpoint label if assigned, commit hash, summary of changes, validation, remaining work, conflicts/decisions, and publication status. Use docs/team/HANDOFF-TEMPLATE.md when helpful. For an in-repository handoff, store one file per task under docs/team/handoffs/ to reduce editing collisions.

If the handoff is committed with the checkpoint it describes, record the exact resulting hash in the pull request or final session message. Do not repeatedly amend a commit to insert its own hash.

## Access and tool limits
- An assistant without Git or file access can explain the process or prepare patches. It must not claim to have fetched, merged, tested, committed, pushed, or deployed.
- A connector that reads GitHub is not proof that a local checkout is synchronized or that writes are permitted.
- A downloaded ZIP or old chat attachment is a snapshot. Read current repository instructions after fetching.
- If working directly through a GitHub API, use a task branch based on the observed current commit; preserve all untouched tree entries and use current file SHAs/ref guards where available. Re-read changed refs before retrying a conflict. Do not blindly replace files from an old snapshot.
