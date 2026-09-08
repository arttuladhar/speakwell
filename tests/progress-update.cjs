const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

(async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "speakwell-progress-"));
  let server;

  async function startServer() {
    server = spawn(process.execPath, ["server.js"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, DATA_DIR: dataDir, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Server did not start")),
        10000,
      );
      server.stdout.on("data", (data) => {
        const match = String(data).match(/http:\/\/localhost:\d+/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });
      server.stderr.on("data", (data) => process.stderr.write(data));
      server.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async function stopServer() {
    if (server && server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
  }

  try {
    const base = await startServer();
    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@speakwell.dev",
        password: "password123",
      }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";", 1)[0];
    const user = await login.json();

    const config = await fetch(`${base}/api/config`, { headers: { Cookie: cookie } });
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { directRecordingUpload: false });

    const course = await fetch(`${base}/api/course`, { headers: { Cookie: cookie } });
    assert.equal(course.status, 200);
    assert.equal((await course.json()).days.length, 10);

    const update = await fetch(`${base}/api/progress/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        status: "in_progress",
        notes: "Practiced opening.",
        selfRating: 6,
      }),
    });
    assert.equal(update.status, 200);
    const progress = await update.json();
    assert.equal(progress.user_id, user.id);
    assert.equal(progress.day, 1);
    assert.equal(progress.status, "in_progress");
    assert.equal(progress.notes, "Practiced opening.");
    assert.equal(progress.self_rating, 6);
    assert.equal(progress.completed_at, null);
    assert.ok(progress.updated_at);

    const log = await fetch(`${base}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        day: 1,
        durationMinutes: 12,
        energyLevel: 7,
        confidenceLevel: 6,
        notes: "Kept a steady pace.",
      }),
    });
    assert.equal(log.status, 201);
    assert.equal((await log.json()).notes, "Kept a steady pace.");
    const logs = await fetch(`${base}/api/logs?day=1`, {
      headers: { Cookie: cookie },
    });
    assert.equal(logs.status, 200);
    assert.equal((await logs.json()).length, 1);

    const recordingId = "a".repeat(32);
    const media = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]);
    const recording = await fetch(
      `${base}/api/recordings/${recordingId}?day=1&duration=5`,
      {
        method: "PUT",
        headers: { "Content-Type": "video/webm", Cookie: cookie },
        body: media,
      },
    );
    assert.equal(recording.status, 201);
    assert.equal((await recording.json()).id, recordingId);
    const recordings = await fetch(`${base}/api/recordings?day=1`, {
      headers: { Cookie: cookie },
    });
    assert.equal(recordings.status, 200);
    assert.equal((await recordings.json()).length, 1);
    const playback = await fetch(`${base}/api/recordings/${recordingId}/media`, {
      headers: { Cookie: cookie },
    });
    assert.equal(playback.status, 200);
    assert.deepEqual(Buffer.from(await playback.arrayBuffer()), media);

    const register = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Second Speaker",
        email: "second-speaker@example.com",
        password: "password123",
      }),
    });
    assert.equal(register.status, 201);
    const otherCookie = register.headers.get("set-cookie").split(";", 1)[0];
    const otherLogs = await fetch(`${base}/api/logs`, {
      headers: { Cookie: otherCookie },
    });
    assert.deepEqual(await otherLogs.json(), []);
    const otherRecording = await fetch(
      `${base}/api/recordings/${recordingId}/media`,
      { headers: { Cookie: otherCookie } },
    );
    assert.equal(otherRecording.status, 404);

    const remove = await fetch(`${base}/api/recordings/${recordingId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(remove.status, 200);
    console.log("PASS: authenticated course, progress, logs, and recordings use user-scoped tables.");
  } finally {
    await stopServer();
    await rm(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});