---
description: Prepare a release with changelog, version bumps, and git tag
model: haiku
---

# Release Prep

Prepare a release: generate changelog from commits since last tag, bump versions in plugin.json and marketplace.json, update CHANGELOG.md, and create a git tag.

## Arguments

$ARGUMENTS — The version tag to create, e.g. v1.3.0 or 1.3.0. Normalize to x.y.z for changelog headings and vx.y.z for git tags.

## Process

### 1. Determine Range

Find the latest existing git tag and list commits between it and HEAD:

```bash
git describe --tags --abbrev=0 2>/dev/null
```

Then list commits in that range:

```bash
git log <LAST_TAG>..HEAD --oneline
```

If no previous tag exists, use all commits.

### 2. Analyze Commits

Read each commit message and diff to classify changes into these categories:

- Added, marked with + prefix: New features, new endpoints, new UI elements. Typically from feat commits.
- Changed, marked with \* prefix: Refactors, redesigns, improvements, behavior changes. From refactor/chore/perf commits or feat commits that modify existing behavior.
- Fixed, marked with ! prefix: Bug fixes. From fix commits.
- Removed, marked with - prefix: Deleted features, removed code paths.

Rules:

- Include the Linear ticket ID in parentheses when present
- Keep descriptions concise, one line per change, technical but clear
- Group by app/package using subheadings like ### UI, ### Server, etc. Skip grouping if all changes are in one area.
- Within each group, order entries: + first, then \*, then !, then -

### 3. Draft Changelog Entry

Present the draft to the user in this format:

```
## [x.y.z] - YYYY-MM-DD

+ Added feature description (XX-123)
+ Another added feature (XX-456)

* Changed something (XX-123)
* Another change (XX-456)

! Fixed a bug (XX-123)

- Removed something (XX-123)
```

WAIT for user approval before writing.

### 4. Update Files

After approval, update all three files atomically:

**4a. Update CHANGELOG.md**

Insert the approved changelog entry under the `## [Unreleased]` heading (keep that heading empty above the new entry).

**4b. Bump version in `.claude-plugin/plugin.json`**

Update the `"version"` field to the new version (x.y.z, no v prefix):

```json
{
  "version": "x.y.z"
}
```

**4c. Bump version in `$HOME/code/claude-marketplace/.claude-plugin/marketplace.json`**

Find the `lens` entry in the `plugins` array and update its `"version"` field to x.y.z:

```json
{
  "name": "lens",
  "version": "x.y.z",
  ...
}
```

### 5. Commit and Tag

Stage all changed files and commit:

```bash
git add CHANGELOG.md .claude-plugin/plugin.json
```

Also stage the marketplace file (separate repo, but same commit message for clarity — user will commit separately):

```bash
# In $HOME/code/claude-marketplace:
git add .claude-plugin/marketplace.json
```

Commit the lens repo with message: `docs: Update changelog and bump version to vx.y.z`

Then create the tag:

```bash
git tag vx.y.z
```

Remind the user to also commit the marketplace repo separately.

### 6. Report

Output:

- Release version
- Number of changelog entries
- Tag name created
- Files updated: CHANGELOG.md, .claude-plugin/plugin.json, $HOME/code/claude-marketplace/.claude-plugin/marketplace.json
- Next steps: `git push origin main --tags` for this repo, commit + push marketplace repo
