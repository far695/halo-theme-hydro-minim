# Issue tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues for `liuyiwuqing/halo-theme-hydro-minim`. Use the `gh` CLI for issue operations from inside this clone.

For the standard scripted issue → branch → PR → auto-close workflow, use `scripts/issue-pr.sh`. See `docs/agents/issue-pr-workflow.md`.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside the clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in this repo.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
