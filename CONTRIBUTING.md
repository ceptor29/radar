# Contributing to Radar

Thanks for your interest in contributing! This project follows an open contribution model. Please read this guide before opening an issue or pull request.

## Getting started

1. Fork the repo and clone your fork.
2. Install dependencies: `npm install`
3. Seed a local database: `npm run seed`
4. Start the dev servers: `npm run dev` (web on http://localhost:5173, API on http://localhost:4000)

## Before you start

- Open an [issue](https://github.com/ceptor29/radar/issues) describing the bug or feature so we know what you are working on.
- Keep changes focused: one logical change per PR.

## Development workflow

- Write code in `apps/web`, `apps/server`, or `shared` following the conventions in neighboring files.
- Run checks before pushing:

  ```bash
  npm run typecheck
  npm test
  npm run seed   # if you touched the schema or seed data
  ```

- The plan documents in the repo root are the source of truth for product direction.

## Commit messages

Use conventional, imperative-style commits, e.g.:

- `feat(risks): add residual score history export`
- `fix(scoring): clamp likelihood below zero`
- `docs: explain demo accounts`

## Pull requests

- Fill out the PR template.
- Link any related issues with `Closes #123`.
- Ensure CI (typecheck, tests, build, seed) is green.
- Reviewers may ask for changes; keep the conversation on the PR.

## Reporting bugs

Use the [bug report template](https://github.com/ceptor29/radar/issues/new/choose) and include the browser/Node versions, steps to reproduce, and whether it happens with `npm run dev`.

## Code of conduct

All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the project maintainers.

## Questions

Open a discussion or ask in an issue before making large changes.