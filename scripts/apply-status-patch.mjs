import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const allowedStatuses = new Set(["active", "inactive", "unknown"]);
const canonicalPath = resolve("data/canonical/canines.json");

function usage() {
  console.log("Usage: npm run apply:status-patch -- <patch-file.json> [--dry-run]");
}

function fail(message) {
  console.error(`Status patch failed: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const patchPath = args.find((arg) => arg !== "--dry-run" && arg !== "--help" && arg !== "-h");

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (!patchPath) {
  usage();
  fail("missing patch file path.");
}

const patch = JSON.parse(readFileSync(resolve(patchPath), "utf8"));

if (patch.schemaVersion !== 1) {
  fail("schemaVersion must be 1.");
}

if (patch.kind !== "canine-status-patch") {
  fail("kind must be canine-status-patch.");
}

if (!Array.isArray(patch.updates)) {
  fail("updates must be an array.");
}

const updates = patch.updates.map((update, index) => {
  if (!update || typeof update !== "object") {
    fail(`updates[${index}] must be an object.`);
  }

  if (typeof update.canineId !== "string" || update.canineId.length === 0) {
    fail(`updates[${index}].canineId must be a non-empty string.`);
  }

  if (!allowedStatuses.has(update.status)) {
    fail(`updates[${index}].status must be active, inactive, or unknown.`);
  }

  return {
    canineId: update.canineId,
    status: update.status
  };
});

const duplicateIds = updates
  .map((update) => update.canineId)
  .filter((canineId, index, ids) => ids.indexOf(canineId) !== index);

if (duplicateIds.length > 0) {
  fail(`duplicate canine updates: ${Array.from(new Set(duplicateIds)).join(", ")}.`);
}

let canonicalText = readFileSync(canonicalPath, "utf8");
const summaries = [];

for (const update of updates) {
  const idPattern = escapeRegExp(update.canineId);
  const recordPattern = new RegExp(`("id"\\s*:\\s*"${idPattern}"[\\s\\S]*?"status"\\s*:\\s*")([^"]+)(")`);
  const match = canonicalText.match(recordPattern);

  if (!match) {
    fail(`canineId not found: ${update.canineId}.`);
  }

  const previousStatus = match[2];

  if (!allowedStatuses.has(previousStatus)) {
    fail(`${update.canineId} has unsupported current status '${previousStatus}'.`);
  }

  if (previousStatus === update.status) {
    summaries.push({ ...update, previousStatus, changed: false });
    continue;
  }

  canonicalText = canonicalText.replace(recordPattern, `$1${update.status}$3`);
  summaries.push({ ...update, previousStatus, changed: true });
}

const changed = summaries.filter((summary) => summary.changed);

if (!dryRun) {
  writeFileSync(canonicalPath, canonicalText, "utf8");
}

console.log(`${dryRun ? "Dry run" : "Applied"} ${changed.length} changed status${changed.length === 1 ? "" : "es"} from ${updates.length} update${updates.length === 1 ? "" : "s"}.`);

for (const summary of summaries) {
  const marker = summary.changed ? "changed" : "unchanged";
  console.log(`${marker}: ${summary.canineId} ${summary.previousStatus} -> ${summary.status}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
