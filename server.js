const path = require("path");
const { createHash } = require("node:crypto");
const express = require("express");
const { del, put } = require("@vercel/blob");
const { handleUpload } = require("@vercel/blob/client");
const { corePracticeLoop, days } = require("./data/courseSeed");
const { all, get, initDb, isPostgres, run } = require("./db");
const {
  createSession,
  currentUser,
  destroySession,
  login,
  register,
  requireAuth,
  setSessionCookie,
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Fixed local account so contributors can sign in without registering. See README "Mock user".
const MOCK_USER = {
  name: "Demo Speaker",
  email: "demo@speakwell.dev",
  password: "password123",
};

async function seedMockUser() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (isProduction || process.env.DISABLE_MOCK_USER === "true") return;
  try {
    await register(MOCK_USER);
    console.log(`Mock user ready → ${MOCK_USER.email} / ${MOCK_USER.password}`);
  } catch (error) {
    if (!/unique|duplicate/i.test(error.message)) throw error;
  }
}

app.use(express.json());
// Prevent conditional-GET caching from serving stale, per-user JSON (e.g. 304 with outdated recordings list).
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await register(req.body || {});
    setSessionCookie(res, await createSession(user.id));
    res.status(201).json(user);
  } catch (error) {
    const duplicate = /unique|duplicate/i.test(error.message);
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? "An account with that email already exists." : error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await login(req.body || {});
    setSessionCookie(res, await createSession(user.id));
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

const recordingTypes = new Set([
  "video/webm",
  "audio/webm",
  "video/mp4",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
]);
const validRecordingId = (id) => /^[a-f0-9]{32}$/.test(id);
const maxRecordingBytes = 50 * 1024 * 1024;

async function uploadedBlobSize(blob) {
  if (Number.isSafeInteger(blob.size)) return blob.size;
  const response = await fetch(blob.url, { method: "HEAD" });
  if (!response.ok) return null;
  const size = Number(response.headers.get("content-length"));
  return Number.isSafeInteger(size) ? size : null;
}

app.post("/api/recordings/client-upload", async (req, res) => {
  if (!isPostgres || !process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(404).json({ error: "Direct uploads are unavailable." });
  }
  if (!["blob.generate-client-token", "blob.upload-completed"].includes(req.body?.type)) {
    return res.status(400).json({ error: "Invalid recording upload request." });
  }
  try {
    const result = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await currentUser(req);
        if (!user) throw new Error("Please sign in to continue.");
        const recording = JSON.parse(clientPayload || "{}");
        if (
          pathname !== `recordings/${recording.id}` ||
          !validRecordingId(recording.id) ||
          !Number.isInteger(recording.day) ||
          recording.day < 1 ||
          recording.day > 10 ||
          (recording.duration !== null &&
            (!Number.isInteger(recording.duration) ||
              recording.duration < 1 ||
              recording.duration > 86400)) ||
          !recordingTypes.has(recording.mime) ||
          !/^[a-f0-9]{64}$/.test(recording.checksum)
        ) {
          throw new Error("Invalid recording details.");
        }
        return {
          allowedContentTypes: [...recordingTypes],
          maximumSizeInBytes: maxRecordingBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ ...recording, userId: user.id }),
          // Compute the callback URL from the request instead of relying on Vercel's
          // auto-injected VERCEL_URL/VERCEL_ENV vars, which require a project setting
          // ("Automatically expose System Environment Variables") that may be off.
          callbackUrl: `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}${req.originalUrl}`,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const recording = JSON.parse(tokenPayload || "{}");
        const expectedPathname = `recordings/${recording.id}`;
        const size = await uploadedBlobSize(blob);
        const sizeInvalid =
          !Number.isSafeInteger(size) || size < 1 || size > maxRecordingBytes;
        if (blob.pathname !== expectedPathname || blob.contentType !== recording.mime || sizeInvalid) {
          // Log which field mismatched; the client only sees a generic error.
          console.error("Recording upload mismatch:", {
            blobPathname: blob.pathname,
            expectedPathname,
            blobContentType: blob.contentType,
            expectedMime: recording.mime,
            blobSize: size,
            sizeInvalid,
          });
          throw new Error("Uploaded recording details did not match the request.");
        }
        await run(
          `INSERT INTO user_recordings
            (id, user_id, day, mime_type, duration_seconds, size_bytes, checksum, blob_url, blob_pathname)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            recording.id,
            recording.userId,
            recording.day,
            recording.mime,
            recording.duration,
            size,
            recording.checksum,
            blob.url,
            blob.pathname,
          ],
        );
      },
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Could not authorize direct recording upload:", error);
    res.status(400).json({
      error:
        error.message?.includes("No blob credentials")
          ? "Recording storage credentials are unavailable. Verify BLOB_READ_WRITE_TOKEN in Vercel and redeploy."
          : "Could not start the recording upload. Check Vercel Function logs and retry.",
    });
  }
});

app.use("/api", requireAuth);

app.get("/api/config", (req, res) => {
  const directRecordingUpload = isPostgres && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  res.json({
    directRecordingUpload,
    recordingUploadError:
      isPostgres && !directRecordingUpload
        ? "Recording storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel."
        : null,
  });
});


app.get("/api/course", async (req, res) => {
  try {
    for (const day of days)
      await run(
        `INSERT INTO user_progress (user_id, day, status, notes, self_rating, completed_at, updated_at)
         VALUES (?, ?, 'not_started', '', NULL, NULL, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, day) DO NOTHING`,
        [req.user.id, day.day],
      );
    const rows = await all(`
      SELECT
        c.day,
        c.title,
        c.focus,
        c.presentation,
        c.exercise_duration,
        c.exercise_json,
        c.reflection_json,
        p.status,
        p.notes,
        p.self_rating,
        p.completed_at,
        p.updated_at
      FROM course_days c
      LEFT JOIN user_progress p ON p.day = c.day AND p.user_id = ?
      ORDER BY c.day ASC
    `, [req.user.id]);

    const data = rows.map((row) => ({
      day: row.day,
      title: row.title,
      focus: row.focus,
      presentation: row.presentation,
      exerciseDuration: row.exercise_duration,
      exercise: JSON.parse(row.exercise_json),
      reflection: JSON.parse(row.reflection_json),
      resources: days.find((day) => day.day === row.day)?.resources || [],
      progress: {
        status: row.status,
        notes: row.notes,
        selfRating: row.self_rating,
        completedAt: row.completed_at,
        updatedAt: row.updated_at,
      },
    }));

    const stats = await get(`
      SELECT
        COUNT(*) AS total_days,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_days
      FROM user_progress WHERE user_id = ?
    `, [req.user.id]);

    return res.json({
      corePracticeLoop,
      days: data,
      stats: {
        totalDays: stats.total_days || 0,
        completedDays: stats.completed_days || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/progress/:day", async (req, res) => {
  try {
    const day = Number(req.params.day);
    const { status, notes, selfRating } = req.body;
    const validStatuses = new Set(["not_started", "in_progress", "completed"]);

    if (!Number.isInteger(day) || day < 1 || day > 10) {
      return res.status(400).json({ error: "Invalid day" });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const ratingValue =
      selfRating === null || selfRating === undefined
        ? null
        : Number(selfRating);
    if (
      ratingValue !== null &&
      (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 10)
    ) {
      return res
        .status(400)
        .json({ error: "selfRating must be between 1 and 10" });
    }

    const completedAt = status === "completed" ? "CURRENT_TIMESTAMP" : "NULL";
    await run(
      `
      UPDATE user_progress
      SET status = ?,
          notes = ?,
          self_rating = ?,
          completed_at = ${completedAt},
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND day = ?
    `,
      [status, String(notes || ""), ratingValue, req.user.id, day],
    );

    const updated = await get(`SELECT * FROM user_progress WHERE user_id = ? AND day = ?`, [req.user.id, day]);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const { day, durationMinutes, energyLevel, confidenceLevel, notes } =
      req.body;
    const parsedDay = Number(day);
    const parsedDuration = Number(durationMinutes);
    const parsedEnergy =
      energyLevel === undefined || energyLevel === null
        ? null
        : Number(energyLevel);
    const parsedConfidence =
      confidenceLevel === undefined || confidenceLevel === null
        ? null
        : Number(confidenceLevel);

    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 10) {
      return res.status(400).json({ error: "Invalid day" });
    }
    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 180
    ) {
      return res
        .status(400)
        .json({ error: "durationMinutes must be between 1 and 180" });
    }
    if (
      parsedEnergy !== null &&
      (!Number.isInteger(parsedEnergy) || parsedEnergy < 1 || parsedEnergy > 10)
    ) {
      return res
        .status(400)
        .json({ error: "energyLevel must be between 1 and 10" });
    }
    if (
      parsedConfidence !== null &&
      (!Number.isInteger(parsedConfidence) ||
        parsedConfidence < 1 ||
        parsedConfidence > 10)
    ) {
      return res
        .status(400)
        .json({ error: "confidenceLevel must be between 1 and 10" });
    }

    const result = await run(
      `
      INSERT INTO user_practice_logs
      (user_id, day, duration_minutes, energy_level, confidence_level, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)${isPostgres ? " RETURNING id" : ""}
    `,
      [
        req.user.id,
        parsedDay,
        parsedDuration,
        parsedEnergy,
        parsedConfidence,
        String(notes || ""),
      ],
    );

    const row = await get(
      `SELECT * FROM user_practice_logs WHERE id = ? AND user_id = ?`,
      [result.lastID || result.rows[0]?.id, req.user.id],
    );
    return res.status(201).json(row);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const day = req.query.day ? Number(req.query.day) : null;
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 10)) {
      return res.status(400).json({ error: "Invalid day query parameter" });
    }

    const logs = day
      ? await all(
          `SELECT * FROM user_practice_logs WHERE user_id = ? AND day = ? ORDER BY id DESC`,
          [req.user.id, day],
        )
      : await all(
          `SELECT * FROM user_practice_logs WHERE user_id = ? ORDER BY id DESC`,
          [req.user.id],
        );

    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const recordingFields =
  "id, day, mime_type, duration_seconds, size_bytes, created_at";

app.get("/api/recordings", async (req, res) => {
  const day = req.query.day === undefined ? null : Number(req.query.day);
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 10)) {
    return res.status(400).json({ error: "Invalid day" });
  }
  try {
    res.json(
      await all(
        `SELECT ${recordingFields} FROM user_recordings WHERE user_id = ?${day === null ? "" : " AND day = ?"} ORDER BY created_at DESC, id DESC`,
        day === null ? [req.user.id] : [req.user.id, day],
      ),
    );
  } catch (error) {
    res.status(500).json({ error: "Could not load recordings. Please retry." });
  }
});

app.put(
  "/api/recordings/:id",
  (req, res, next) => {
    const day = Number(req.query.day);
    const mime = (req.get("Content-Type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const duration =
      req.query.duration === undefined ? null : Number(req.query.duration);
    if (
      !validRecordingId(req.params.id) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 10 ||
      (duration !== null &&
        (!Number.isInteger(duration) || duration < 1 || duration > 86400))
    ) {
      return res.status(400).json({ error: "Invalid recording details" });
    }
    if (!recordingTypes.has(mime))
      return res
        .status(415)
        .json({ error: "Use a WebM, MP4, Ogg audio, or WAV recording." });
    req.recording = { day, mime, duration };
    next();
  },
  express.raw({ type: () => true, limit: "50mb" }),
  async (req, res) => {
    const { day, mime, duration } = req.recording;
    const media = req.body;
    if (!Buffer.isBuffer(media) || !media.length)
      return res.status(400).json({ error: "The recording is empty." });
    const signature = mime.endsWith("/webm")
      ? media.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : mime.endsWith("/mp4")
        ? media.toString("ascii", 4, 8) === "ftyp"
        : mime === "audio/ogg"
          ? media.toString("ascii", 0, 4) === "OggS"
          : media.toString("ascii", 0, 4) === "RIFF" &&
            media.toString("ascii", 8, 12) === "WAVE";
    if (!signature)
      return res
        .status(415)
        .json({
          error: "This file does not match a supported recording format.",
        });
    try {
      const checksum = createHash("sha256").update(media).digest("hex");
      // A stable client ID makes retrying an interrupted upload safe.
      if (isPostgres) {
        const blob = await put(`recordings/${req.params.id}`, media, {
          access: "public",
          addRandomSuffix: false,
          contentType: mime,
        });
        await run(
          `INSERT INTO user_recordings
            (id, user_id, day, mime_type, duration_seconds, size_bytes, checksum, blob_url, blob_pathname)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            req.params.id,
            req.user.id,
            day,
            mime,
            duration,
            media.length,
            checksum,
            blob.url,
            blob.pathname,
          ],
        );
      } else {
        await run(
          `INSERT OR IGNORE INTO user_recordings (id, user_id, day, mime_type, duration_seconds, size_bytes, checksum, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, req.user.id, day, mime, duration, media.length, checksum, media],
        );
      }
      const saved = await get(
        `SELECT ${recordingFields}, checksum FROM user_recordings WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user.id],
      );
      if (
        !saved ||
        saved.checksum !== checksum ||
        saved.day !== day ||
        saved.mime_type !== mime ||
        saved.duration_seconds !== duration
      ) {
        return res
          .status(409)
          .json({
            error: "This recording ID is already used by another take.",
          });
      }
      delete saved.checksum;
      res.status(201).json(saved);
    } catch (error) {
      console.error("Could not save recording:", error);
      res
        .status(500)
        .json({
          error:
            "Could not save the recording. Your preview is still available; please retry.",
        });
    }
  },
);

app.get("/api/recordings/:id/media", async (req, res) => {
  if (!validRecordingId(req.params.id))
    return res.status(404).json({ error: "Recording not found" });
  try {
    if (isPostgres) {
      const row = await get(
        "SELECT blob_url FROM user_recordings WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
      );
      if (!row) return res.status(404).json({ error: "Recording not found" });
      return res.redirect(307, row.blob_url);
    }
    // ponytail: bounded 50 MB blobs suit this personal app; stream files if storage or concurrency grows.
    const row = await get(
      "SELECT mime_type, media, size_bytes, day FROM user_recordings WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!row) return res.status(404).json({ error: "Recording not found" });
    res.set({
      "Content-Type": row.mime_type,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    });
    if (req.query.download === "1")
      res.set(
        "Content-Disposition",
        `attachment; filename="speakwell-day-${row.day}-${req.params.id}.${row.mime_type.split("/")[1]}"`,
      );
    let start = 0,
      end = row.size_bytes - 1;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (range && (range[1] || range[2])) {
        if (range[1]) {
          start = Number(range[1]);
          end = range[2] ? Math.min(Number(range[2]), end) : end;
        } else {
          start = Math.max(0, row.size_bytes - Number(range[2]));
        }
      } else start = row.size_bytes;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= row.size_bytes
      ) {
        return res
          .status(416)
          .set("Content-Range", `bytes */${row.size_bytes}`)
          .end();
      }
      res
        .status(206)
        .set("Content-Range", `bytes ${start}-${end}/${row.size_bytes}`);
    }
    res
      .set("Content-Length", String(end - start + 1))
      .end(row.media.subarray(start, end + 1));
  } catch (error) {
    res.status(500).json({ error: "Could not play the recording." });
  }
});

app.delete("/api/recordings/:id", async (req, res) => {
  if (!validRecordingId(req.params.id))
    return res.status(404).json({ error: "Recording not found" });
  try {
    if (isPostgres) {
      const row = await get(
        "SELECT blob_url FROM user_recordings WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
      );
      if (!row) return res.status(404).json({ error: "Recording not found" });
      await del(row.blob_url);
    }
    const result = await run(
      "DELETE FROM user_recordings WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    if (!result.changes)
      return res.status(404).json({ error: "Recording not found" });
    res.json({ deleted: true });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Could not delete the recording. Please retry." });
  }
});

app.use((error, _req, res, _next) => {
  res
    .status(error.status || 500)
    .json({
      error:
        error.type === "entity.too.large"
          ? "Recordings must be 50 MB or smaller."
          : "Could not read your request. Please retry.",
    });
});

const ready = initDb();

if (require.main === module) {
  ready
    .then(() => seedMockUser())
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(
          `Workshop app running at http://localhost:${server.address().port}`,
        );
      });
    })
    .catch((err) => {
      console.error("Failed to initialize database:", err);
      process.exit(1);
    });
}

module.exports = { app, ready };
