// NODE_PATH=/path/to/playwright/node_modules node tests/recordings.cjs
// Real browser capture and API persistence, using a temporary database only.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
(async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "speakwell-recordings-"));
  let server, browser;
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
      server.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      server.stderr.on("data", (data) => process.stderr.write(data));
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
    let base = await startServer();
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    });
    const context = await browser.newContext({
      permissions: ["camera", "microphone"],
    });
    // Generate real media tracks without relying on OS camera/microphone services.
    await context.addInitScript(() => {
      window.testStreams = [];
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const destination = audio.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        await audio.resume();
        const stream = new MediaStream(destination.stream.getAudioTracks());
        let animation;
        if (constraints.video) {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext("2d");
          const paint = () => {
            ctx.fillStyle = "#176b50";
            ctx.fillRect(0, 0, 320, 180);
            ctx.fillStyle = "white";
            ctx.fillText(String(Date.now()), 20, 80);
          };
          paint();
          animation = setInterval(paint, 80);
          canvas
            .captureStream(12)
            .getVideoTracks()
            .forEach((track) => stream.addTrack(track));
        }
        stream.getTracks().forEach((track) => {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            if (stream.getTracks().every((t) => t.readyState === "ended")) {
              clearInterval(animation);
              audio.close();
            }
          };
        });
        window.testStreams.push(stream);
        return stream;
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/#day/1`);
    await page
      .getByRole("button", { name: "Start recording", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop recording", exact: true })
      .waitFor();
    await page.waitForTimeout(1800);
    await page
      .getByRole("button", { name: "Stop recording", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .waitFor();
    await page.waitForFunction(
      () => document.querySelector(".draft-take video")?.readyState >= 2,
    );
    // Lose the first save response after the server commits: retry must reuse the take ID.
    let failSave = true;
    await page.route("**/api/recordings/*?day=*", async (route) => {
      if (route.request().method() === "PUT" && failSave) {
        failSave = false;
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        return route.fulfill({
          status: 503,
          json: { error: "Simulated interrupted response." },
        });
      }
      await route.continue();
    });
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .click();
    await page.getByText(/Simulated interrupted response/).waitFor();
    assert.equal(await page.locator(".draft-take video").count(), 1);
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .click();
    await page
      .getByText("Recording saved. You can replay it below or in your journal.")
      .waitFor();
    let rows = await (await fetch(`${base}/api/recordings`)).json();
    assert.equal(rows.length, 1, "Retry cannot duplicate a committed take");
    const video = rows[0];
    assert.equal(video.day, 1);
    assert.equal(video.mime_type, "video/webm");
    const media = Buffer.from(
      await (
        await fetch(`${base}/api/recordings/${video.id}/media`)
      ).arrayBuffer(),
    );
    assert.equal(media.length, video.size_bytes);
    const range = await fetch(`${base}/api/recordings/${video.id}/media`, {
      headers: { Range: "bytes=0-15" },
    });
    assert.equal(range.status, 206);
    assert.deepEqual(
      Buffer.from(await range.arrayBuffer()),
      media.subarray(0, 16),
    );
    const suffix = await fetch(`${base}/api/recordings/${video.id}/media`, {
      headers: { Range: "bytes=-12" },
    });
    assert.deepEqual(
      Buffer.from(await suffix.arrayBuffer()),
      media.subarray(-12),
    );
    assert.equal(
      (
        await fetch(`${base}/api/recordings/${video.id}/media`, {
          headers: { Range: "bytes=999999999-" },
        })
      ).status,
      416,
    );
    assert.equal(
      (
        await fetch(`${base}/api/recordings/${video.id}/media?download=1`)
      ).headers
        .get("content-disposition")
        .startsWith("attachment"),
      true,
    );
    await page.reload();
    await page.locator(".saved-take video").waitFor();
    await page
      .getByRole("link", { name: "Practice journal", exact: true })
      .click();
    await page.locator(".saved-take video").waitFor();
    await page.goto(`${base}/#day/2`);
    await page.getByLabel("Recording mode").selectOption("audio");
    await page
      .getByRole("button", { name: "Start recording", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop recording", exact: true })
      .waitFor();
    await page.waitForTimeout(1200);
    // Leaving must end capture and retain the unsaved take on its original day.
    await page.getByRole("link", { name: "Next day", exact: true }).click();
    await page
      .getByRole("heading", { name: "Conquering Filler Words", exact: true })
      .waitFor();
    assert(
      await page.evaluate(() =>
        window.testStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    );
    await page.goBack();
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .waitFor();
    assert.equal(await page.locator(".draft-take audio").count(), 1);
    assert.equal(
      await page
        .getByRole("button", { name: "Stop recording", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .click();
    await page
      .getByText("Recording saved. You can replay it below or in your journal.")
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/speakwell-recordings-mobile.png",
      fullPage: true,
    });
    // Upload fallback and invalid-file rejection.
    await page.locator("[data-upload]").setInputFiles({
      name: "example.webm",
      mimeType: "video/webm",
      buffer: media,
    });
    await page
      .getByRole("button", { name: "Save recording", exact: true })
      .click();
    await page
      .getByText("Recording saved. You can replay it below or in your journal.")
      .waitFor();
    await page.locator("[data-upload]").setInputFiles({
      name: "empty.webm",
      mimeType: "video/webm",
      buffer: Buffer.alloc(0),
    });
    await page
      .getByText(
        "Choose a nonempty WebM, MP4, Ogg audio, or WAV file up to 50 MB.",
      )
      .waitFor();
    // Permission failure is actionable and never leaves the UI recording.
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Denied", "NotAllowedError");
      };
    });
    await page
      .getByRole("button", { name: "Start recording", exact: true })
      .click();
    await page.getByText(/Camera or microphone access was denied/).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Start recording", exact: true })
        .isEnabled(),
      true,
    );
    // Real API validation and conflict handling.
    const id = "a".repeat(32);
    const put = (type, body, day = 1, recordingId = id) =>
      fetch(`${base}/api/recordings/${recordingId}?day=${day}`, {
        method: "PUT",
        headers: { "Content-Type": type },
        body,
      });
    assert.equal((await put("text/html", "<script>bad</script>")).status, 415);
    assert.equal(
      (await put("video/webm", Buffer.from("not a video"))).status,
      415,
    );
    assert.equal((await put("video/webm", Buffer.alloc(0))).status, 400);
    assert.equal((await put("video/webm", media, 11)).status, 400);
    assert.equal((await put("video/webm", media, 1, "invalid")).status, 400);
    assert.equal((await put("video/webm", media, 2, video.id)).status, 409);
    assert.equal(
      (await put("video/webm", Buffer.alloc(50 * 1024 * 1024 + 1))).status,
      413,
    );
    assert.equal((await fetch(`${base}/api/recordings?day=11`)).status, 400);
    assert.equal(
      (await fetch(`${base}/api/recordings/${id}/media`)).status,
      404,
    );
    assert.deepEqual(errors, []);
    await page.close();
    await stopServer();
    base = await startServer();
    rows = await (await fetch(`${base}/api/recordings`)).json();
    assert.equal(rows.length, 3, "Recordings survive server restart");
    assert.deepEqual(
      Buffer.from(
        await (
          await fetch(`${base}/api/recordings/${video.id}/media`)
        ).arrayBuffer(),
      ),
      media,
    );
    const review = await context.newPage();
    await review.goto(`${base}/#day/1`);
    review.once("dialog", (dialog) => dialog.accept());
    await review
      .getByRole("button", { name: "Delete recording from Day 1" })
      .click();
    await review
      .getByText(
        "No saved recordings yet. Record or upload a take from a day’s practice screen.",
      )
      .waitFor();
    assert.equal(
      (await fetch(`${base}/api/recordings/${video.id}/media`)).status,
      404,
    );
    console.log(
      "PASS: real video/audio capture, preview, upload, retry without duplicates, navigation stop, journal, reload, server restart, byte ranges, downloads, deletion, permissions, size/type validation, and mobile layout.",
    );
  } catch (error) {
    if (browser)
      for (const context of browser.contexts())
        for (const page of context.pages())
          console.error(
            await page.locator(".recorder-panel").allTextContents(),
          );
    throw error;
  } finally {
    if (browser) await browser.close();
    await stopServer();
    await rm(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
