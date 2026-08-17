(function (root) {
  "use strict";

  const CACHE_STORAGE_KEY = "nornDraftDiscoveredModels";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const COOLDOWN_MS = 60 * 60 * 1000;
  const DISCOVERY_TIMEOUT_MS = 20 * 1000;
  const ENDPOINTS = Object.freeze({
    Gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    OpenAI: "https://api.openai.com/v1/models"
  });

  const isTextGenerationModel = (model) => {
    const identity = `${model.name || ""} ${model.baseModelId || ""} ${model.displayName || ""}`.toLowerCase();
    return !/(image|imagen|nano.?banana|veo|lyria|audio|speech|tts|embedding)/i.test(identity);
  };

  const normalizeGeminiModels = (body) => (Array.isArray(body?.models) ? body.models : [])
    .filter((model) => {
      const actions = [...(model.supportedActions || []), ...(model.supportedGenerationMethods || [])];
      return isTextGenerationModel(model)
        && (actions.includes("generateContent") || actions.includes("generate_content"));
    })
    .map((model) => ({
      id: String(model.baseModelId || model.name || "").replace(/^models\//, ""),
      label: String(model.displayName || model.baseModelId || model.name || ""),
      description: String(model.description || "")
    }))
    .filter((model) => model.id);

  const normalizeOpenAiModels = (body) => (Array.isArray(body?.data) ? body.data : [])
    .filter((model) => /^(gpt-|o\d|chatgpt-)/i.test(String(model.id || "")))
    .map((model) => ({ id: String(model.id), label: String(model.id), description: "Available for this OpenAI API key." }));

  const normalizeModels = (provider, body) => {
    const models = provider === "OpenAI" ? normalizeOpenAiModels(body) : normalizeGeminiModels(body);
    return Array.from(new Map(models.map((model) => [model.id, model])).values())
      .sort((left, right) => left.label.localeCompare(right.label));
  };

  const discoverModels = async ({ provider, apiKey, fetchImpl = root.fetch }) => {
    const headers = provider === "OpenAI"
      ? { Authorization: `Bearer ${apiKey}` }
      : { "x-goog-api-key": apiKey };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = root.setTimeout(() => controller?.abort(), DISCOVERY_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(ENDPOINTS[provider], {
        headers,
        ...(controller ? { signal: controller.signal } : {})
      });
    } finally {
      root.clearTimeout(timeoutId);
    }
    const responseText = await response.text().catch(() => "");
    let body = {};
    try { body = responseText ? JSON.parse(responseText) : {}; } catch (error) { body = {}; }
    if (!response.ok) throw new Error(`${provider} model discovery failed (${response.status}).`);
    return normalizeModels(provider, body);
  };

  const readCache = async (storage) => {
    const stored = await storage.get(CACHE_STORAGE_KEY);
    return stored[CACHE_STORAGE_KEY] && typeof stored[CACHE_STORAGE_KEY] === "object"
      ? stored[CACHE_STORAGE_KEY]
      : {};
  };

  const getFreshCachedModels = (cache, provider, now = Date.now()) => {
    const entry = cache?.[provider];
    return entry && now - Number(entry.fetchedAt) <= CACHE_TTL_MS ? entry.models || [] : [];
  };

  const getCooldownRemaining = (cache, provider, now = Date.now()) => {
    const fetchedAt = Number(cache?.[provider]?.fetchedAt);
    if (!Number.isFinite(fetchedAt)) return 0;
    return Math.max(0, COOLDOWN_MS - (now - fetchedAt));
  };

  const writeCachedModels = async (storage, cache, provider, models, fetchedAt = Date.now()) => {
    const nextCache = { ...cache, [provider]: { fetchedAt, models } };
    await storage.set({ [CACHE_STORAGE_KEY]: nextCache });
    return nextCache;
  };

  const api = { CACHE_STORAGE_KEY, CACHE_TTL_MS, COOLDOWN_MS, DISCOVERY_TIMEOUT_MS, normalizeModels, discoverModels, readCache, getFreshCachedModels, getCooldownRemaining, writeCachedModels };
  root.NornDraftModelDiscovery = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
