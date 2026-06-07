import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const canonicalDir = resolve("data", "canonical");
const humansPath = resolve(canonicalDir, "humans.json");
const charactersPath = resolve(canonicalDir, "characters.json");
const caninesPath = resolve(canonicalDir, "canines.json");
const traitProfilesPath = resolve(canonicalDir, "trait-profiles.json");
const lineageProfilesPath = resolve(canonicalDir, "lineage-profiles.json");
const sourceObservationsPath = resolve(canonicalDir, "source-observations.json");
const comparisonObservationsPath = resolve(canonicalDir, "comparison-observations.json");

function usage() {
  console.log("Usage: npm run apply:canine-draft -- <draft-file.json> [--dry-run]");
}

function fail(message) {
  console.error(`Canine draft apply failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function upsertById(records, nextRecord, label) {
  if (!nextRecord || typeof nextRecord !== "object") {
    return false;
  }

  if (typeof nextRecord.id !== "string" || nextRecord.id.length === 0) {
    fail(`${label} must have a non-empty id.`);
  }

  const index = records.findIndex((record) => record.id === nextRecord.id);
  if (index >= 0) {
    records[index] = nextRecord;
    return true;
  }

  records.push(nextRecord);
  return true;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const draftPath = args.find((arg) => arg !== "--dry-run" && arg !== "--help" && arg !== "-h");

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

if (!draftPath) {
  usage();
  fail("missing draft file path.");
}

const draft = readJson(resolve(draftPath));

if (draft.schemaVersion !== 1) {
  fail("schemaVersion must be 1.");
}

if (draft.kind !== "canonical-canine-draft") {
  fail("kind must be canonical-canine-draft.");
}

const humans = readJson(humansPath);
const characters = readJson(charactersPath);
const canines = readJson(caninesPath);
const traitProfiles = readJson(traitProfilesPath);
const lineageProfiles = readJson(lineageProfilesPath);
const sourceObservations = readJson(sourceObservationsPath);
const comparisonObservations = readJson(comparisonObservationsPath);

upsertById(humans, draft.human, "human");
upsertById(characters, draft.character, "character");
upsertById(canines, draft.canine, "canine");

if (draft.traitProfile) {
  const index = traitProfiles.findIndex((profile) => profile.canineId === draft.traitProfile.canineId);
  if (index >= 0) {
    traitProfiles[index] = draft.traitProfile;
  } else {
    traitProfiles.push(draft.traitProfile);
  }
}

if (draft.canine && typeof draft.canine.id === "string") {
  const existingLineageIndex = lineageProfiles.findIndex((profile) => profile.canineId === draft.canine.id);
  if (existingLineageIndex < 0) {
    lineageProfiles.push({
      canineId: draft.canine.id,
      sireId: null,
      damId: null,
      paternalGrandSireId: null,
      paternalGrandDamId: null,
      maternalGrandSireId: null,
      maternalGrandDamId: null
    });
  }
}

upsertById(sourceObservations, draft.sourceObservation, "sourceObservation");

if (Array.isArray(draft.comparisonObservations)) {
  for (const observation of draft.comparisonObservations) {
    if (!observation || typeof observation !== "object") {
      fail("comparisonObservations entries must be objects.");
    }
    const nextObservation = {
      ...observation,
      targetCanineId: observation.targetCanineId ?? draft.canine?.id ?? null
    };
    upsertById(comparisonObservations, nextObservation, "comparisonObservation");
  }
}

if (!dryRun) {
  writeJson(humansPath, humans);
  writeJson(charactersPath, characters);
  writeJson(caninesPath, canines);
  writeJson(traitProfilesPath, traitProfiles);
  writeJson(lineageProfilesPath, lineageProfiles);
  writeJson(sourceObservationsPath, sourceObservations);
  writeJson(comparisonObservationsPath, comparisonObservations);
}

console.log(`${dryRun ? "Dry run" : "Applied"} canonical canine draft for ${draft.canine?.id ?? "unknown canine"}.`);
