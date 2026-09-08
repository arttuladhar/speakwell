const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const hook = path.join(__dirname, "pre-commit-validation.cjs");

function output(command, cwd = path.resolve(__dirname, "../..")) {
  const result = spawnSync(process.execPath, [hook], {
    cwd,
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).hookSpecificOutput;
}

const decision = (command) => output(command).permissionDecision;

assert.equal(decision("git status"), "allow");
assert.equal(
  decision("git diff -- .github/hooks/pre-commit-validation.cjs"),
  "allow",
);
assert.equal(decision("git commit -m test"), "deny");
assert.equal(decision("cd . && git commit -m test"), "deny");
assert.equal(decision("git -C . commit -m test"), "deny");
assert.equal(decision("git -c user.name=Reviewer commit -m test"), "deny");
assert.equal(decision("env git commit -m test"), "deny");
assert.equal(decision("GIT_AUTHOR_NAME=Reviewer git commit -m test"), "deny");
assert.equal(decision("env GIT_AUTHOR_NAME=Reviewer git commit -m test"), "deny");
assert.equal(decision("command /usr/bin/git commit -m test"), "deny");
assert.equal(decision("builtin command git commit -m test"), "deny");
assert.equal(decision("'git' commit -m test"), "deny");
assert.equal(decision('"/usr/bin/git" commit -m test'), "deny");
assert.equal(decision('printf "git commit -m test"'), "allow");

const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "speakwell-hook-"));
try {
  execFileSync("git", ["init", "--quiet"], { cwd: tempRepo });
  fs.writeFileSync(path.join(tempRepo, "screenshot.png"), "generated image");
  execFileSync("git", ["add", "screenshot.png"], { cwd: tempRepo });
  const artifactResult = output("git commit -m test", tempRepo);
  assert.equal(artifactResult.permissionDecision, "deny");
  assert.match(artifactResult.permissionDecisionReason, /screenshot\.png/);
} finally {
  fs.rmSync(tempRepo, { recursive: true, force: true });
}

console.log("PASS: pre-commit hook detects commit commands and staged artifacts.");