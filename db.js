const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const { days } = require("./data/courseSeed");

const usePostgres = Boolean(process.env.DATABASE_URL);
let sqlite;
let pool;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
} else {
  const defaultDataDir =
    process.env.VERCEL === "1"
      ? path.join("/tmp", "speakwell-data")
      : path.join(__dirname, "data");
  const dataDir = process.env.DATA_DIR || defaultDataDir;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new sqlite3.Database(path.join(dataDir, "workshop.db"));
}

function postgresSql(sql, params) {
  let index = 0;
  return {
    text: sql.replace(/\?/g, () => `$${++index}`),
    values: params,
  };
}

function run(sql, params = []) {
  if (usePostgres) {
    return pool.query(postgresSql(sql, params)).then((result) => ({
      changes: result.rowCount,
      lastID: result.rows[0]?.id,
      rows: result.rows,
    }));
  }
  return new Promise((resolve, reject) => {
    sqlite.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      resolve({ changes: this.changes, lastID: this.lastID, rows: [] });
    });
  });
}

function get(sql, params = []) {
  if (usePostgres)
    return pool.query(postgresSql(sql, params)).then((result) => result.rows[0]);
  return new Promise((resolve, reject) => {
    sqlite.get(sql, params, (error, row) => {
      if (error) return reject(error);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  if (usePostgres)
    return pool.query(postgresSql(sql, params)).then((result) => result.rows);
  return new Promise((resolve, reject) => {
    sqlite.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

async function initDb() {
  if (usePostgres) {
    await run(`CREATE TABLE IF NOT EXISTS course_days (
      day INTEGER PRIMARY KEY, title TEXT NOT NULL, focus TEXT NOT NULL,
      presentation TEXT NOT NULL, exercise_duration TEXT NOT NULL,
      exercise_json TEXT NOT NULL, reflection_json TEXT NOT NULL
    )`);
    await run(`CREATE TABLE IF NOT EXISTS progress (
      day INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'not_started',
      notes TEXT NOT NULL DEFAULT '', self_rating INTEGER, completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL, FOREIGN KEY(day) REFERENCES course_days(day)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS practice_logs (
      id BIGSERIAL PRIMARY KEY, day INTEGER NOT NULL, duration_minutes INTEGER NOT NULL,
      energy_level INTEGER, confidence_level INTEGER, notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL, FOREIGN KEY(day) REFERENCES course_days(day)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY, day INTEGER NOT NULL, mime_type TEXT NOT NULL,
      duration_seconds INTEGER, size_bytes INTEGER NOT NULL, checksum TEXT NOT NULL,
      blob_url TEXT NOT NULL, blob_pathname TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY(day) REFERENCES course_days(day)
    )`);
    for (const day of days) {
      await run(`INSERT INTO course_days
        (day, title, focus, presentation, exercise_duration, exercise_json, reflection_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (day) DO UPDATE SET title = EXCLUDED.title, focus = EXCLUDED.focus,
        presentation = EXCLUDED.presentation, exercise_duration = EXCLUDED.exercise_duration,
        exercise_json = EXCLUDED.exercise_json, reflection_json = EXCLUDED.reflection_json`, [
        day.day, day.title, day.focus, day.presentation, day.exerciseDuration,
        JSON.stringify(day.exercise), JSON.stringify(day.reflection),
      ]);
      await run(`INSERT INTO progress (day, status, notes, self_rating, completed_at, updated_at)
        VALUES (?, 'not_started', '', NULL, NULL, NOW()) ON CONFLICT (day) DO NOTHING`, [day.day]);
    }
    return;
  }

  await run(`CREATE TABLE IF NOT EXISTS course_days (
    day INTEGER PRIMARY KEY, title TEXT NOT NULL, focus TEXT NOT NULL,
    presentation TEXT NOT NULL, exercise_duration TEXT NOT NULL,
    exercise_json TEXT NOT NULL, reflection_json TEXT NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS progress (
    day INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'not_started',
    notes TEXT NOT NULL DEFAULT '', self_rating INTEGER, completed_at TEXT,
    updated_at TEXT NOT NULL, FOREIGN KEY(day) REFERENCES course_days(day)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS practice_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, day INTEGER NOT NULL, duration_minutes INTEGER NOT NULL,
    energy_level INTEGER, confidence_level INTEGER, notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, FOREIGN KEY(day) REFERENCES course_days(day)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY, day INTEGER NOT NULL, mime_type TEXT NOT NULL,
    duration_seconds INTEGER, size_bytes INTEGER NOT NULL, checksum TEXT NOT NULL,
    media BLOB NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(day) REFERENCES course_days(day)
  )`);
  for (const day of days) {
    await run(`INSERT OR REPLACE INTO course_days
      (day, title, focus, presentation, exercise_duration, exercise_json, reflection_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      day.day, day.title, day.focus, day.presentation, day.exerciseDuration,
      JSON.stringify(day.exercise), JSON.stringify(day.reflection),
    ]);
    await run(`INSERT OR IGNORE INTO progress
      (day, status, notes, self_rating, completed_at, updated_at)
      VALUES (?, 'not_started', '', NULL, NULL, datetime('now'))`, [day.day]);
  }
}

module.exports = { all, get, initDb, isPostgres: usePostgres, run };
