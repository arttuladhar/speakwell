const {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} = require("node:crypto");
const { get, run } = require("./db");

const SESSION_COOKIE = "speakwell_session";
const SESSION_DAYS = 30;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actual.length === expectedBuffer.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
}

function sessionHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([name, value]) => name && value)
      .map(([name, ...value]) => [name, decodeURIComponent(value.join("="))]),
  );
}

function setSessionCookie(res, token, maxAge = SESSION_DAYS * 86400) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
}

async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await run(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionHash(token), userId, expiresAt],
  );
  return token;
}

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const row = await get(
    `SELECT users.id, users.email, users.name
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP`,
    [sessionHash(token)],
  );
  return row || null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in to continue." });
    req.user = user;
    req.sessionToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    next();
  } catch (error) {
    next(error);
  }
}

async function register({ email, name, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Enter a valid email address.");
  if (String(name || "").trim().length < 2) throw new Error("Enter your name.");
  if (String(password || "").length < 8) throw new Error("Password must be at least 8 characters.");
  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: String(name).trim().slice(0, 80),
    passwordHash: hashPassword(password),
  };
  await run(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    [user.id, user.email, user.name, user.passwordHash],
  );
  return { id: user.id, email: user.email, name: user.name };
}

async function login({ email, password }) {
  const user = await get(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    [normalizeEmail(email)],
  );
  if (!user || !verifyPassword(password, user.password_hash))
    throw new Error("Email or password is incorrect.");
  return { id: user.id, email: user.email, name: user.name };
}

async function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [sessionHash(token)]);
  setSessionCookie(res, "", 0);
}

module.exports = {
  createSession,
  currentUser,
  destroySession,
  login,
  register,
  requireAuth,
  setSessionCookie,
};
