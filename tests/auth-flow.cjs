// NODE_PATH=/path/to/playwright/node_modules node tests/auth-flow.cjs
// Sign-up and sign-in browser flow using an isolated temporary database.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

(async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "speakwell-auth-"));
  let server;
  let browser;

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
    browser = await chromium.launch({ channel: "chrome", headless: true });

    const signupContext = await browser.newContext();
    const signupPage = await signupContext.newPage();
    signupPage.setDefaultTimeout(15000);
    await signupPage.goto(`${base}/#day/3`);

    await signupPage.getByRole("heading", { name: "Welcome back." }).waitFor();
    await signupPage.getByRole("tab", { name: "Create account" }).click();
    await signupPage
      .getByRole("heading", { name: "Make room for your voice." })
      .waitFor();

    await signupPage.getByLabel("Your name").fill("E2E Speaker");
    await signupPage
      .getByLabel("Email address")
      .fill("e2e-speaker@example.com");
    await signupPage.getByLabel("Password").fill("password123");
    await signupPage.getByRole("button", { name: "Create my account" }).click();
    await signupPage
      .getByRole("heading", { name: "Conquering Filler Words" })
      .waitFor();
    assert.equal(new URL(signupPage.url()).hash, "#day/3");
    await signupContext.close();

    const signinContext = await browser.newContext();
    const signinPage = await signinContext.newPage();
    signinPage.setDefaultTimeout(15000);
    await signinPage.goto(base);
    await signinPage.getByLabel("Email address").fill("e2e-speaker@example.com");
    await signinPage.getByLabel("Password").fill("password123");
    await signinPage.getByRole("button", { name: "Sign in" }).click();
    await signinPage.getByText("Your 10-day journey").waitFor();
    await signinContext.close();

    const invalidContext = await browser.newContext();
    const invalidPage = await invalidContext.newPage();
    invalidPage.setDefaultTimeout(15000);
    await invalidPage.goto(base);
    await invalidPage.getByLabel("Email address").fill("e2e-speaker@example.com");
    await invalidPage.getByLabel("Password").fill("wrongpass");
    await invalidPage.getByRole("button", { name: "Sign in" }).click();
    await invalidPage
      .getByRole("alert")
      .filter({ hasText: "Email or password is incorrect." })
      .waitFor();
    await invalidContext.close();

    console.log("PASS: signup, deep-link restoration, signin, and invalid credentials.");
  } finally {
    await browser?.close();
    await stopServer();
    await rm(dataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
