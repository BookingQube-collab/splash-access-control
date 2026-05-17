#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

function runGit(args) {
  const result = spawnSync("git", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function currentBranch() {
  return execSync("git branch --show-current", { encoding: "utf8" }).trim();
}

function branchSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function hasChanges() {
  const out = execSync("git status --porcelain", { encoding: "utf8" });
  return out.trim().length > 0;
}

function parseMessage(argv) {
  const mIdx = argv.indexOf("-m");
  if (mIdx !== -1 && argv[mIdx + 1]) return argv[mIdx + 1];
  const msgIdx = argv.indexOf("--message");
  if (msgIdx !== -1 && argv[msgIdx + 1]) return argv[msgIdx + 1];
  return process.env.PUSH_PR_MESSAGE || "Update";
}

const argv = process.argv.slice(2);
const message = parseMessage(argv);
const skipPr = argv.includes("--no-pr");
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "main";

const branch = currentBranch();
if (branch === "main" || branch === "master") {
  run(`git switch -c update/${branchSuffix()}`);
}

if (hasChanges()) {
  runGit(["add", "-A"]);
  runGit(["commit", "-m", message]);
} else {
  console.log("No local changes to commit; pushing existing commits.");
}

run("git push -u origin HEAD");

if (!skipPr) {
  run(`gh pr create --base ${base} --fill`);
}
