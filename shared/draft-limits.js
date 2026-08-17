(function (root) {
  "use strict";

  const DRAFT_LIMITS = Object.freeze({
    prompt: Object.freeze({ key: "promptMaxCharacters", label: "Prompt", defaultValue: 12000, min: 1000, max: 20000 }),
    context: Object.freeze({ key: "contextMaxCharacters", label: "Context", defaultValue: 4000, min: 500, max: 8000 })
  });

  const getConfig = (kind) => DRAFT_LIMITS[kind] || DRAFT_LIMITS.prompt;
  const getLimit = (kind, value) => {
    const config = getConfig(kind);
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return config.defaultValue;
    return Math.min(config.max, Math.max(config.min, parsed));
  };

  const api = { DRAFT_LIMITS, getConfig, getLimit };
  root.NornDraftDraftLimits = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
