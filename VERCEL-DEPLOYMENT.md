# Deploy Speakwell to Vercel

The Vercel deployment uses:

- **Neon Postgres** for course progress, practice logs, and recording metadata.
- **Vercel Blob** for audio and video recording files.
- **Vercel Functions** for the Express API.

## Vercel project variables

Add these production environment variables in the Vercel project settings:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |

The application creates its tables and seeds the ten course days on first startup. Existing SQLite data is not automatically migrated; export or migrate it before switching production traffic.

## Deploy from GitHub Actions

The workflow at `.github/workflows/deploy-vercel.yml` deploys `main` to Vercel. Add these GitHub repository secrets:

| Secret | Description |
| --- | --- |
| `VERCEL_TOKEN` | Vercel access token |
| `VERCEL_ORG_ID` | Vercel team or account ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Find the organization and project IDs by running this locally from the repository:

```bash
npx vercel link
cat .vercel/project.json
```

Copy the `orgId` and `projectId` values into the GitHub secrets. Never commit `.vercel` or any token.

After the secrets are configured, every push to `main` runs the deployment workflow. The workflow pulls the production environment, builds the Vercel output, and deploys the prebuilt result.

If GitHub Actions fails with `You defined "--token", but it's missing a value`, confirm that `VERCEL_TOKEN` is configured as a repository secret for the branch or environment running the workflow. An unset secret is rendered as an empty token in the workflow command.

## Local Vercel verification

Install the Vercel CLI and link the project:

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

The local process needs `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` from the pulled environment.

## Important storage notes

- Neon should use its pooled connection string for serverless workloads.
- Vercel Blob stores recording bytes; Postgres stores only metadata and Blob URLs.
- Recording bytes upload directly from the browser to Vercel Blob. The API only authorizes the upload and stores metadata after Blob confirms completion, avoiding the Vercel Function request-body limit and long-running upload timeouts.
- Do not rely on `/tmp` or the deployed project directory for persistent data.
- Existing Docker deployments continue using SQLite and the named `workshop-data` volume.
- Keep the built-in authentication enabled and add network controls or another authentication layer before exposing the application publicly.