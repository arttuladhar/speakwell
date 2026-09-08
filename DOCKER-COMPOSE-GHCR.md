# Deploy Speakwell with Docker Compose

This guide runs Speakwell from the published GitHub Container Registry image:

```text
ghcr.io/arttuladhar/speakwell:latest
```

## Prerequisites

- Docker Engine
- Docker Compose v2 (`docker compose`)
- A host with port `3000` available

## 1. Create a deployment directory

On the deployment host:

```bash
mkdir -p ~/speakwell
cd ~/speakwell
```

Create `docker-compose.yml` with the following contents:

```yaml
services:
  app:
    image: ghcr.io/arttuladhar/speakwell:latest
    container_name: public-speaking-workshop
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
      NODE_ENV: production
    volumes:
      - workshop-data:/app/data

volumes:
  workshop-data:
```

The named `workshop-data` volume persists the SQLite database, progress, practice logs, and recordings when the container is replaced.

## 2. Log in to GHCR

If the package is private, create a GitHub personal access token with `read:packages`, then log in:

```bash
echo "$CR_PAT" | docker login ghcr.io -u arttuladhar --password-stdin
```

For a public package, this step is usually optional, but logging in avoids anonymous pull limits.

## 3. Pull and start the app

```bash
docker compose pull
docker compose up -d
```

Check the container:

```bash
docker compose ps
docker compose logs -f app
```

Open the app at:

```text
http://HOSTNAME_OR_IP:3000
```

Replace `HOSTNAME_OR_IP` with the server hostname or IP address. Use `localhost:3000` when running on your own machine.

## Update to the latest image

```bash
docker compose pull
docker compose up -d
```

Compose recreates the container with the new image while retaining the `workshop-data` volume.

## Stop the app

Stop and remove the container while keeping stored data:

```bash
docker compose down
```

To also delete the database and recordings, remove the named volume explicitly:

```bash
docker compose down -v
```

This deletion is irreversible.

## Production security

Speakwell has local accounts and per-user data isolation, but it is not hardened for direct public exposure. The production configuration above also prevents the fixed local mock user from being created. Before exposing the app outside a trusted network:

- Put it behind HTTPS.
- Add another authentication layer or restrict network access.
- Use a firewall to limit access to the published port.
- Back up the `workshop-data` volume.

Browser camera and microphone capture requires `localhost` or HTTPS. Accounts isolate recordings in the app, but anyone with database or backup access can read them.
