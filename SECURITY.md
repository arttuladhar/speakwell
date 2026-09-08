# Security Policy

## Scope

Speakwell is a local-first application. The default server has no authentication or authorization and is not intended to be exposed directly to the public internet.

Recordings, progress, and practice logs are stored in the configured SQLite database and are available to anyone who can reach the app. Treat the database and backups as sensitive personal data.

## Reporting a vulnerability

Please do not open a public issue for an undisclosed vulnerability. Use the repository's private security advisory feature when available. If private advisories are unavailable, contact the project maintainer through the repository profile with:

- A short description of the vulnerability and its impact
- Affected files, endpoints, or configuration
- Reproduction steps or a minimal proof of concept
- Any suggested mitigation

Please allow reasonable time for investigation and a fix before public disclosure. Do not include real recordings, credentials, or personal data in a report.

## Deployment guidance

For any shared deployment, place the app behind HTTPS and an authentication layer, restrict network access, protect the SQLite database and Docker volume, and keep Node.js and dependencies updated. Camera and microphone capture should only be enabled for trusted users.