const assert = require("assert");
const presets = require("../shared/tone-presets.js");

const now = "2026-07-12T00:00:00.000Z";
const first = presets.createPreset({ id: "tone-one", name: "Warm support", instruction: "Use warm, professional support language.", now });

assert.equal(first.id, "tone-one");
assert.equal(first.createdAt, now);
assert.equal(first.updatedAt, now);
assert.equal(presets.validatePresetInput({ name: " ", instruction: "Valid", presets: [] }).ok, false);
assert.equal(presets.validatePresetInput({ name: "Valid", instruction: " ", presets: [] }).ok, false);
assert.equal(presets.validatePresetInput({ name: "warm SUPPORT", instruction: "Another instruction", presets: [first] }).ok, false);
assert.equal(presets.validatePresetInput({ name: "Warm support", instruction: "Updated", presets: [first], excludeId: first.id }).ok, true);

const edited = presets.updatePreset(first, { name: "Warm support", instruction: "Use concise, warm support language.", now: "2026-07-13T00:00:00.000Z" });
assert.equal(edited.id, first.id);
assert.equal(edited.createdAt, first.createdAt);
assert.notEqual(edited.updatedAt, first.updatedAt);

const malformed = presets.sanitizePresetCollection({
  schemaVersion: 1,
  presets: [first, { id: "tone-one", name: "Duplicate ID", instruction: "Ignored" }, { id: "tone-two", name: "WARM SUPPORT", instruction: "Ignored" }, { invalid: true }]
});
assert.equal(malformed.collection.presets.length, 1);
assert.equal(malformed.shouldRepair, true);
assert.equal(presets.resolvePresetSelection("tone-one", malformed.collection.presets), "tone-one");
assert.equal(presets.resolvePresetSelection("missing", malformed.collection.presets), "");
const afterDelete = malformed.collection.presets.filter((preset) => preset.id !== "tone-one");
assert.equal(afterDelete.length, 0);
assert.equal(presets.resolvePresetSelection("tone-one", afterDelete), "");

const builtInPrompt = presets.buildPrompt({
  mode: "Generate Reply",
  tones: ["Professional", "Friendly"],
  customInstruction: "",
  prompt: "Source message",
  context: "",
  replyLength: "Balanced"
});
assert.ok(builtInPrompt.includes("Use these tones: Professional, Friendly."));
assert.ok(builtInPrompt.includes("Message to reply to:\nSource message"));

const customPrompt = presets.buildPrompt({
  mode: "Rewrite Draft",
  tones: [],
  customInstruction: "Use warm, concise language.",
  prompt: "Draft source",
  context: "Customer is waiting",
  replyLength: "Concise"
});
assert.equal((customPrompt.match(/Use warm, concise language\./g) || []).length, 1);
assert.ok(customPrompt.includes("User's draft reply:\nDraft source"));
assert.ok(!customPrompt.includes("Use these tones:"));

console.log("tone-presets tests passed");
