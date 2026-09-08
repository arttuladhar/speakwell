// Exercises /api/recordings/client-upload against a stubbed Postgres pool so the real
// @vercel/blob token generation and webhook signature verification run unmocked.
const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const BLOB_TOKEN = "vercel_blob_rw_teststore123_secretvalue1234567890";
const SESSION_TOKEN = "unit-test-session-token";
const SESSION_HASH = crypto.createHash("sha256").update(SESSION_TOKEN).digest("hex");
const USER = { id: "user-1", email: "student@example.com", name: "Test Student" };
const RECORDING_ID = "a".repeat(32);
const CHECKSUM = "b".repeat(64);

const recordingInserts = [];
Pool.prototype.query = (queryConfig) => {
  const sql = typeof queryConfig === "string" ? queryConfig : queryConfig.text;
  const values = typeof queryConfig === "string" ? [] : queryConfig.values;
  if (/FROM sessions JOIN users/i.test(sql)) {
    return Promise.resolve(
      values[0] === SESSION_HASH
        ? { rows: [USER], rowCount: 1 }
        : { rows: [], rowCount: 0 },
    );
  }
  if (/INSERT INTO user_recordings/i.test(sql)) {
    recordingInserts.push(values);
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
  return Promise.resolve({ rows: [], rowCount: 0 });
};

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.BLOB_READ_WRITE_TOKEN = BLOB_TOKEN;

const { app, ready } = require("../../server");

let server;
let base;

test.before(async () => {
  await ready;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test.beforeEach(() => {
  recordingInserts.length = 0;
});

function authedCookie() {
  return `speakwell_session=${encodeURIComponent(SESSION_TOKEN)}`;
}

async function postClientUpload(body, headers = {}) {
  const response = await fetch(`${base}/api/recordings/client-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function validClientPayload(overrides = {}) {
  return JSON.stringify({
    id: RECORDING_ID,
    day: 3,
    duration: 42,
    mime: "video/webm",
    checksum: CHECKSUM,
    ...overrides,
  });
}

test("rejects request bodies with an unsupported event type", async () => {
  const { status, body } = await postClientUpload({
    type: "blob.generate-presigned-url",
    payload: {},
  });
  assert.equal(status, 400);
  assert.equal(body.error, "Invalid recording upload request.");
});

test("rejects token generation when the caller is not signed in", async () => {
  const { status } = await postClientUpload({
    type: "blob.generate-client-token",
    payload: {
      pathname: `recordings/${RECORDING_ID}`,
      clientPayload: validClientPayload(),
      multipart: false,
    },
  });
  assert.equal(status, 400);
  assert.equal(recordingInserts.length, 0);
});

test("rejects invalid recording details even when authenticated", async () => {
  const { status } = await postClientUpload(
    {
      type: "blob.generate-client-token",
      payload: {
        pathname: `recordings/${RECORDING_ID}`,
        clientPayload: validClientPayload({ day: 0 }),
        multipart: false,
      },
    },
    { Cookie: authedCookie() },
  );
  assert.equal(status, 400);
});

test("issues a client token for a valid authenticated request", async () => {
  const { status, body } = await postClientUpload(
    {
      type: "blob.generate-client-token",
      payload: {
        pathname: `recordings/${RECORDING_ID}`,
        clientPayload: validClientPayload(),
        multipart: false,
      },
    },
    { Cookie: authedCookie() },
  );
  assert.equal(status, 200);
  assert.equal(body.type, "blob.generate-client-token");
  assert.match(body.clientToken, /^vercel_blob_client_/);
});

test("persists the recording once the upload-completed webhook is verified", async () => {
  const tokenPayload = JSON.stringify({
    id: RECORDING_ID,
    day: 3,
    duration: 42,
    mime: "video/webm",
    checksum: CHECKSUM,
    userId: USER.id,
  });
  const blobUrl = `https://example.public.blob.vercel-storage.com/recordings/${RECORDING_ID}`;
  const requestBody = {
    type: "blob.upload-completed",
    payload: {
      blob: {
        url: blobUrl,
        pathname: `recordings/${RECORDING_ID}`,
        contentType: "video/webm",
      },
      tokenPayload,
    },
  };
  const rawBody = JSON.stringify(requestBody);
  const signature = crypto.createHmac("sha256", BLOB_TOKEN).update(rawBody).digest("hex");

  const originalFetch = global.fetch;
  global.fetch = (url, options) =>
    url === blobUrl && options?.method === "HEAD"
      ? Promise.resolve(
          new Response(null, {
            status: 200,
            headers: { "content-length": "12345" },
          }),
        )
      : originalFetch(url, options);
  let response;
  try {
    response = await fetch(`${base}/api/recordings/client-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-vercel-signature": signature },
      body: rawBody,
    });
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: "blob.upload-completed",
    response: "ok",
  });
  assert.equal(recordingInserts.length, 1);
  const [id, userId, day, mime, duration, size, checksum] = recordingInserts[0];
  assert.equal(id, RECORDING_ID);
  assert.equal(userId, USER.id);
  assert.equal(day, 3);
  assert.equal(mime, "video/webm");
  assert.equal(duration, 42);
  assert.equal(size, 12345);
  assert.equal(checksum, CHECKSUM);
});

test("rejects the recording when storage omits a content-length header", async () => {
  const tokenPayload = JSON.stringify({
    id: RECORDING_ID,
    day: 3,
    duration: 42,
    mime: "video/webm",
    checksum: CHECKSUM,
    userId: USER.id,
  });
  const blobUrl = `https://example.public.blob.vercel-storage.com/recordings/${RECORDING_ID}`;
  const requestBody = {
    type: "blob.upload-completed",
    payload: {
      blob: {
        url: blobUrl,
        pathname: `recordings/${RECORDING_ID}`,
        contentType: "video/webm",
      },
      tokenPayload,
    },
  };
  const rawBody = JSON.stringify(requestBody);
  const signature = crypto.createHmac("sha256", BLOB_TOKEN).update(rawBody).digest("hex");

  const originalFetch = global.fetch;
  // Do not persist metadata when storage cannot report the actual recording size.
  global.fetch = (url, options) =>
    url === blobUrl && options?.method === "HEAD"
      ? Promise.resolve(new Response(null, { status: 200 }))
      : originalFetch(url, options);
  let response;
  try {
    response = await fetch(`${base}/api/recordings/client-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-vercel-signature": signature },
      body: rawBody,
    });
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.status, 400);
  assert.equal(recordingInserts.length, 0);
});

test("rejects an upload-completed webhook with no signature", async () => {
  const { status } = await postClientUpload({
    type: "blob.upload-completed",
    payload: { blob: {}, tokenPayload: "{}" },
  });
  assert.equal(status, 400);
  assert.equal(recordingInserts.length, 0);
});

test("rejects an upload-completed webhook with a forged signature", async () => {
  const requestBody = {
    type: "blob.upload-completed",
    payload: { blob: {}, tokenPayload: "{}" },
  };
  const { status } = await postClientUpload(requestBody, {
    "x-vercel-signature": crypto
      .createHmac("sha256", "wrong-secret")
      .update(JSON.stringify(requestBody))
      .digest("hex"),
  });
  assert.equal(status, 400);
  assert.equal(recordingInserts.length, 0);
});
