const assert = require("assert");
const discovery = require("../shared/model-discovery.js");

const gemini = discovery.normalizeModels("Gemini", {
  models: [
    { name: "models/gemini-test", displayName: "Gemini Test", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3-pro-image", displayName: "Nano Banana Pro", supportedGenerationMethods: ["generateContent"] },
    { name: "models/embed-test", supportedGenerationMethods: ["embedContent"] }
  ]
});
assert.deepEqual(gemini, [{ id: "gemini-test", label: "Gemini Test", description: "" }]);

const openai = discovery.normalizeModels("OpenAI", {
  data: [{ id: "gpt-test" }, { id: "o2" }, { id: "text-embedding-test" }]
});
assert.deepEqual(openai, [
  { id: "gpt-test", label: "gpt-test", description: "Available for this OpenAI API key." },
  { id: "o2", label: "o2", description: "Available for this OpenAI API key." }
]);

assert.equal(discovery.getFreshCachedModels({ Gemini: { fetchedAt: Date.now(), models: gemini } }, "Gemini").length, 1);
assert.equal(discovery.getFreshCachedModels({ Gemini: { fetchedAt: 0, models: gemini } }, "Gemini").length, 0);
assert.equal(discovery.getCooldownRemaining({ Gemini: { fetchedAt: Date.now() } }, "Gemini") > 0, true);
assert.equal(discovery.getCooldownRemaining({ Gemini: { fetchedAt: Date.now() - discovery.COOLDOWN_MS - 1 } }, "Gemini"), 0);

console.log("model-discovery tests passed");
