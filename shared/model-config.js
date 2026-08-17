(function (root) {
  "use strict";

  // Keep provider model IDs in one place. Presets are local so the extension
  // still works without an extra discovery request.
  const MODEL_CONFIG = Object.freeze({
    Gemini: Object.freeze({
      defaultPreset: "auto",
      presets: Object.freeze([
        Object.freeze({ id: "auto", label: "Auto / Recommended", model: "gemini-3.5-flash", description: "Balanced quality and speed for everyday replies.", profile: "Balanced · Recommended" }),
        Object.freeze({ id: "flash-lite", label: "Gemini 3.1 Flash-Lite", model: "gemini-3.1-flash-lite", description: "Fast and cost-efficient for short, high-volume drafts.", profile: "Fast · Lower cost" }),
        Object.freeze({ id: "flash", label: "Gemini 3.5 Flash", model: "gemini-3.5-flash", description: "Strong general-purpose model for polished replies.", profile: "Balanced · Strong quality" })
      ])
    }),
    OpenAI: Object.freeze({
      defaultPreset: "recommended",
      presets: Object.freeze([
        Object.freeze({ id: "recommended", label: "Recommended", model: "gpt-5.4-mini", description: "Fast, capable, and economical for everyday drafting.", profile: "Fast · Lower cost · Recommended" }),
        Object.freeze({ id: "mini", label: "GPT-5.4 mini / cost-friendly", model: "gpt-5.4-mini", description: "Cost-friendly choice for quick, high-volume replies.", profile: "Fastest · Lowest cost" }),
        Object.freeze({ id: "quality", label: "GPT-5.5 / higher quality", model: "gpt-5.5", description: "Higher-quality reasoning for nuanced or complex replies.", profile: "Highest quality · Higher cost" })
      ])
    })
  });

  const CUSTOM_PRESET_ID = "custom";
  const getProviderConfig = (provider) => MODEL_CONFIG[provider] || MODEL_CONFIG.Gemini;
  const getPresetIds = (provider) => [
    ...getProviderConfig(provider).presets.map((preset) => preset.id),
    CUSTOM_PRESET_ID
  ];
  const resolveModel = (provider, presetId, customModel = "", discoveredModels = []) => {
    if (presetId === CUSTOM_PRESET_ID) return customModel.trim();
    if (presetId.startsWith("discovered:")) return presetId.slice("discovered:".length);
    const config = getProviderConfig(provider);
    const preset = config.presets.find((entry) => entry.id === presetId)
      || config.presets.find((entry) => entry.id === config.defaultPreset);
    return preset?.model || "";
  };

  const inferProfile = (modelId) => {
    const id = modelId.toLowerCase();
    if (/lite|mini|nano|flash-lite/.test(id)) return "Fast · Usually lower cost";
    if (/pro|opus|quality|5\.5/.test(id)) return "Higher quality · Usually higher cost";
    if (/flash|haiku|sonnet|gpt-4|gpt-5/.test(id)) return "Balanced · General purpose";
    return "Provider model · Compare pricing";
  };

  const getModelInfo = (provider, presetId, customModel = "", discoveredModels = []) => {
    const modelId = resolveModel(provider, presetId, customModel, discoveredModels);
    const preset = getProviderConfig(provider).presets.find((entry) => entry.id === presetId);
    const discovered = discoveredModels.find((model) => model.id === modelId);
    return {
      modelId,
      description: preset?.description || discovered?.description || "Available for this provider API key.",
      profile: preset?.profile || inferProfile(modelId),
      isEstimated: !preset
    };
  };

  const api = { MODEL_CONFIG, CUSTOM_PRESET_ID, getProviderConfig, getPresetIds, resolveModel, getModelInfo };
  root.NornDraftModelConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
