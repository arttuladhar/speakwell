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

    const course = await fetch(`${base}/api/course`, { headers: { Cookie: cookie } });
    assert.equal(course.status, 200);

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
    console.log("PASS: authenticated progress updates use the user-scoped table.");
  } finally {
    await stopServer();
    await rm(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});