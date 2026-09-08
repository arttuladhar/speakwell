# Speakwell — Public Speaking Workshop

Interactive local web app generated from your Joplin **"10 Day Public Speaking Mastery Course"** note.

Speakwell is designed for local or trusted-network use. It provides local user accounts and session-based authentication, but not automated speaking feedback.

## Requirements

- Node.js 20 or newer
- npm
- Google Chrome for the optional browser flow checks
- Docker and Docker Compose for containerized use

## Features

- Responsive workshop dashboard with a recommended next exercise
- Dedicated day screens with direct links (`/#day/1` through `/#day/10`), previous/next navigation, and browser Back/Forward support
- Guided prepare → practice → reflect flow for all 10 days
- Timers pause and reflection drafts stay available when navigating within the app (until reload)
- Day-specific supporting articles and in-app practice cards in preparation and reflection
- In-app camera + microphone or audio-only recording, previews, uploads, and saved playback
- Recording downloads and deletion from each day and the practice journal
- Pauseable practice timer and exercise reminders
- Session reflections, confidence, energy, and overall self-ratings
- Progress milestones and a chronological practice journal
- Local SQLite persistence (`data/workshop.db`)

## Record your practice

Open any day and use **Record your practice** below the exercise. Choose camera + microphone or audio only, start recording, then stop to preview. Click **Save recording** to keep the take in the app. Saved takes appear on that day and in the practice journal, with playback, download, and delete controls.

- Camera and microphone access require browser permission and **localhost or HTTPS**. An HTTP address on your local network cannot capture directly; use HTTPS or upload a recording instead.
- Uploads support WebM, MP4/M4A, Ogg audio, and WAV. Playback depends on your browser’s codec support; download is always available.
- Live takes stop after 15 minutes or near the 50 MB file limit. The exercise timer and recording controls operate independently.
- Leaving the day stops capture and keeps the unsaved preview until you reload or close the tab. Save or download before leaving the app. Failed saves retain your take for retry.
- Saved recordings are stored with progress in `data/workshop.db`, including in the existing Docker data volume. Back up that database to preserve recordings. The app isolates recordings by account, but anyone with database or backup access can read them.

Use the guided prompts for self-review; the app does not generate automated speaking feedback.

## Browser flow check

Playwright is installed as a dev dependency (`npm ci` or `npm install` sets it up). With Google Chrome installed:

```bash
npm start &                # tests/user-flow.cjs needs the app already running
npm test                   # fast, dependency-free checks
npm run test:api           # spawns a temporary server and database
npm run test:e2e           # browser checks; user-flow needs the app already running
npm run test:all           # runs every tier after the app is started
```

### E2E scenarios

- `tests/user-flow.cjs` — Uses isolated API fixtures to visit all 10 day screens, verify direct URLs and browser Back/Forward navigation, retain in-progress drafts and timers, open resources, retry a failed completion, render the journal safely, validate form input, and check desktop/mobile layouts.
- `tests/auth-flow.cjs` — Starts a temporary server and database, opens a protected deep link while signed out, switches between sign-in and signup, creates an account, verifies the deep link is restored, signs in from a fresh browser context, and confirms invalid credentials show an error without entering the workshop.
- `tests/progress-update.cjs` — Starts a temporary server and database to verify authenticated course, progress, log, and recording APIs use user-scoped data.
- `tests/unit/course-seed.test.cjs` — Fast unit coverage for the canonical course definition.

The user-flow check uses isolated API fixtures. The authentication and API checks launch their own temporary server with a temporary database. Neither check changes your saved progress or uses your physical camera or microphone.

## Configuration

The server reads these optional environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port used by the server |
| `DATA_DIR` | `./data` | Directory containing the SQLite database |
| `DISABLE_MOCK_USER` | unset | Set to `true` to skip seeding the local mock user outside production |

Example:

```bash
PORT=4000 DATA_DIR=/tmp/speakwell-data npm start
```

The database contains workshop progress, practice logs, and saved recordings. Back it up before moving or resetting an installation.

### Vercel

The Vercel deployment uses Neon Postgres for relational data and Vercel Blob for recordings. Set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in the Vercel project environment. Do not use the temporary `/tmp` SQLite fallback for production data. See [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md) for setup and GitHub Actions deployment instructions.

## Run locally

Using the helper script:

```bash
./run-local.sh
```

Or run the commands directly:

```bash
npm install
npm start
```

Open: `http://localhost:3000`

### Mock user

Outside production (no `NODE_ENV=production` or `VERCEL=1`), the server automatically creates a fixed local account on startup so you can sign in immediately without registering:

| Email | Password |
| --- | --- |
| `demo@speakwell.dev` | `password123` |

Set `DISABLE_MOCK_USER=true` to skip seeding this account. Do not rely on the mock user in production; it is skipped there automatically.

## Run with Docker

From this project directory:

```bash
docker build -t public-speaking-workshop:latest .
docker run -d --name public-speaking-workshop -p 3000:3000 -v workshop-data:/app/data public-speaking-workshop:latest
```

Open: `http://localhost:3000`

## Run with Docker Compose

```bash
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

The SQLite database is persisted in the Docker volume `workshop-data`.

## Deployment

For a trusted server, copy the project to the host, install Docker and the Docker Compose plugin, then run:

```bash
docker compose up -d --build
```

Put the app behind HTTPS and an additional authentication layer before exposing it beyond a trusted network. Camera and microphone capture requires `localhost` or HTTPS, and database access must remain restricted because recordings contain sensitive personal data.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please report security issues privately as described in [SECURITY.md](SECURITY.md). This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Speakwell is available under the [MIT License](LICENSE).
