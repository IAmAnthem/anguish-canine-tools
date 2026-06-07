# Data Stewardship

The project should avoid an open writable production database.

## Source Of Truth

Public canine data should live in the Git repository. Git history provides:

- review
- attribution
- rollback
- change discussion
- protection from anonymous direct edits

## Update Paths

Possible data update paths:

1. Maintainer commit.
2. Pull request.
3. GitHub issue containing a generated submission.
4. Out-of-band player submission that a maintainer converts into a commit.
5. Calculator-generated `canonical-canine-draft` import reviewed and applied locally by a maintainer.

## App Behavior

The hosted app should read bundled canonical data. Browser users should not be able to directly mutate canonical data.

Legacy canine data may be promoted into canonical public data after explicit maintainer review. Future private/local data support may still be useful, but it should stay local unless a player intentionally submits it or a maintainer intentionally promotes it.

## Security Posture

Avoid these for the first version:

- shared admin password
- anonymous write access
- live database updates from the public app
- destructive deletes without Git history

Prefer:

- reviewed data changes
- branch protection
- small structured data files
- generated submissions that are easy to inspect
- reversible commits
- structured drafts that keep compare evidence and solved traits together

## Raw Source Material

Raw source material may contain unrelated player profile details, account context, or stale website output.

Guidelines:

- Commit sanitized derived notes by default.
- Do not commit raw player-tools HTML unless it has been reviewed and intentionally sanitized.
- Do not commit private planning workbooks.
- Preserve source timestamps and source URLs when extracting facts from delayed website data.
- Treat delayed website data as an observation, not guaranteed current game state.
- Treat compare-session relatedness as evidence worth storing, especially when full lineage is private or unavailable.
