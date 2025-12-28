# Release process (Web)

## Preconditions
- All PR checks must be green (CI + CodeQL).
- main is protected: changes go through PR.

## Versioning
- We follow SemVer (MAJOR.MINOR.PATCH).
- Default bump:
  - PATCH: fixes, chores, docs.
  - MINOR: new backward-compatible features.
  - MAJOR: breaking changes.

## Creating a release
1) Ensure main is clean and up-to-date
2) Decide the version bump
3) Create a git tag and push it
4) Create a GitHub Release using the tag
