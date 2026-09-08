# Contributing to Speakwell

Thank you for helping improve Speakwell. Small, focused changes are easiest to review and maintain.

## Before you start

1. Check the README and existing issues for related work.
2. For a substantial feature, open an issue first to discuss the behavior and scope.
3. Do not include real recordings, personal data, database files, credentials, or private deployment details in a change.

## Local development

```bash
npm ci
./run-local.sh
```

The app stores local state in `data/workshop.db`. Use `DATA_DIR` to point tests or experiments at a temporary directory.

## Testing

The browser checks require Google Chrome and a temporary Playwright installation:

```bash
npm install --prefix /tmp/speakwell-browser-check playwright --no-audit --no-fund
NODE_PATH=/tmp/speakwell-browser-check/node_modules node tests/user-flow.cjs
NODE_PATH=/tmp/speakwell-browser-check/node_modules node tests/recordings.cjs
```

Before submitting a change:

- Run the relevant browser check when changing the UI or API behavior.
- Verify the app starts with `./run-local.sh`.
- Keep generated databases, recordings, screenshots, and dependency directories out of commits.
- Update the README when setup, configuration, or user-visible behavior changes.

## Pull requests

Describe the problem, the approach, and how you tested it. Include screenshots for meaningful visual changes and call out any data migration, security, privacy, or browser compatibility impact.

Please keep pull requests focused. Reviewers may ask for tests or documentation when a change affects a shared API, persistence, recordings, or a common user flow.

## Code style

Follow the existing JavaScript, HTML, and CSS style. Prefer clear, small changes and existing platform APIs. Avoid adding dependencies unless they solve a problem that cannot reasonably be handled by the current stack.