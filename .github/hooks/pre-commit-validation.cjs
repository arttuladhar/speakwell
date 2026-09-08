const { execFileSync } = require("node:child_process");

function respond(permissionDecision, permissionDecisionReason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason,
      },
    }),
  );
}

function commandFrom(input) {
  return (
    input?.tool_input?.command ||
    input?.toolInput?.command ||
    input?.input?.command ||
    ""
  );
}

function isGitCommitCommand(command) {
  const assignment = String.raw`[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s;&|()]+)`;
  const executable = String.raw`(?:git|'git'|"git"|[^\s;&|()]+\/git|'[^']*\/git'|"[^"]*\/git")`;
  const prefix = String.raw`(?:${assignment}\s+)*(?:(?:env(?:\s+(?:-[^\s;&|()]+|${assignment}))*|(?:builtin\s+)?command)\s+)?`;
  return new RegExp(
    String.raw`(?:^|[;&|()\n]\s*)${prefix}${executable}\s+(?:(?:(?:-C|-c|--git-dir|--work-tree|--namespace)\s+\S+|(?:--git-dir|--work-tree|--namespace)=\S+|--?[^\s;&|()]+)\s+)*commit(?:\s|$|[;&|()])`,
  ).test(
    command,
  );
}

let input;
try {
  input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
} catch {
  respond("deny", "Could not inspect the requested tool call.");
  process.exit(0);
}

const command = commandFrom(input);
if (!isGitCommitCommand(command)) {
  respond("allow", "Not a git commit command.");
  process.exit(0);
}

let stagedFiles;
try {
  execFileSync("git", ["diff", "--cached", "--check"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  stagedFiles = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
} catch (error) {
  const details = String(error.stderr || error.message).trim();
  respond("deny", `Pre-commit validation failed: ${details}`);
  process.exit(0);
}

if (!stagedFiles.length) {
  respond("deny", "No staged changes are available to commit.");
  process.exit(0);
}

const forbidden = stagedFiles.filter((file) =>
  /(^|\/)(node_modules|\.vercel)(\/|$)|(^|\/)\.env(?:\.|$)|\.(?:db|sqlite|sqlite3|webm|mp4|m4a|ogg|wav)$|(^|\/)(?:screenshots?|recordings?)(?:\/|$)|(^|\/)screenshots?[^/]*\.(?:png|jpe?g|webp)$/i.test(
    file,
  ),
);

if (forbidden.length) {
  respond(
    "deny",
    `Remove generated, sensitive, or personal artifacts from the commit: ${forbidden.join(", ")}`,
  );
  process.exit(0);
}

respond(
  "ask",
  "Staged diff checks passed. Confirm that Code Review reported no unresolved findings and all applicable tests from AGENTS.md were run; disclose any known baseline failures before committing.",
);