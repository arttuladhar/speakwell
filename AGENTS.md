# Speakwell Agent Guidelines

## Project Context

- Speakwell is a Node.js 20+ web application for guided speaking practice.
- Keep changes small and consistent with the dependency-light vanilla JavaScript, HTML, CSS, and Express codebase.
- Read [README.md](README.md) for features and setup, [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules, and [SECURITY.md](SECURITY.md) before changing authentication, recordings, or deployment behavior.

## Architecture

- `public/app.js` owns SPA navigation, workshop state, progress, and journal rendering; `public/recordings.js` owns browser capture and recording UI state.
- `server.js` owns HTTP routes. Keep authentication concerns in `auth.js` and database compatibility in `db.js`.
- Preserve both storage modes: local SQLite and production PostgreSQL/Vercel Blob. Parameterize queries and keep user-owned progress, logs, sessions, and recordings isolated by user.
- Treat `data/courseSeed.js` as the canonical course definition. Do not duplicate course content in UI or server code.
- Do not commit databases, recordings, screenshots, credentials, tokens, `.env` files, `.vercel/`, or dependency directories.

## Implementation Practices

- Follow the existing formatting and platform APIs; add dependencies only when the current stack cannot reasonably solve the problem.
- Escape user-controlled values before inserting HTML and validate all API input at the server boundary.
- Keep camera and microphone behavior compatible with secure contexts (`localhost` or HTTPS), and preserve recording size/type validation and retry idempotency.
- Update documentation when setup, environment variables, deployment, or user-visible behavior changes.

## Validation And Review

- Run `npm ci` after dependency or lockfile changes.
- For UI/API changes, run the relevant browser checks. `npm run test:user-flow` requires `npm start` in another process; `npm run test:auth-flow` starts an isolated temporary server.
- Never hide, bypass, or silently accept a failing check; report whether it also reproduces on the base revision.
- Before committing, review the complete diff for correctness, regressions, security/privacy impact, unintended files, generated artifacts, and adequate tests. Run `git diff --check` plus all applicable checks.
- Commit only when the review has no unresolved findings and required checks pass. Do not push when tests are failing, the worktree contains unexplained changes, or the requested target branch is uncertain.
- Push only when explicitly requested. Confirm the current branch and upstream immediately before pushing; never force-push unless explicitly authorized.

## Deployment

- Production must set `NODE_ENV=production` or `VERCEL=1` so secure cookies are enabled and the local mock user is not seeded.
- See [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md) for Vercel configuration and [DOCKER-COMPOSE-GHCR.md](DOCKER-COMPOSE-GHCR.md) for container deployment.