# Security Policy

## Scope

Speakwell is a local-first application with local accounts and session-based authentication. It is not hardened for direct exposure to the public internet.

Recordings, progress, and practice logs are isolated by account in the app and stored in the configured database. Anyone with database or backup access can read this sensitive personal data.

Outside production, the server seeds a documented mock account with fixed credentials. Shared deployments must set `NODE_ENV=production` or `VERCEL=1`; set `DISABLE_MOCK_USER=true` as an additional safeguard.

## Reporting a vulnerability

Please do not open a public issue for an undisclosed vulnerability. Use the repository's private security advisory feature when available. If private advisories are unavailable, contact the project maintainer through the repository profile with:

- A short description of the vulnerability and its impact
- Affected files, endpoints, or configuration
- Reproduction steps or a minimal proof of concept
- Any suggested mitigation

Please allow reasonable time for investigation and a fix before public disclosure. Do not include real recordings, credentials, or personal data in a report.

## Deployment guidance

For any shared deployment, place the app behind HTTPS and an authentication layer, restrict network access, protect the SQLite database and Docker volume, and keep Node.js and dependencies updated. Camera and microphone capture should only be enabled for trusted users.