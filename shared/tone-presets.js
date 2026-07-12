(function (root) {
  "use strict";

  const PRESET_STORAGE_KEY = "nornDraftCustomTonePresets";
  const PRESET_SCHEMA_VERSION = 1;
  const MAX_PRESET_NAME_LENGTH = 60;
  const MAX_PRESET_INSTRUCTION_LENGTH = 1000;

  const normalizeText = (value) => typeof value === "string" ? value.trim() : "";

  const normalizeTimestamp = (value, fallback) => {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : fallback;
  };

  const sanitizePreset = (value, fallbackTimestamp = new Date().toISOString()) => {
    if (!value || typeof value !== "object") {
      return null;
    }

    const id = normalizeText(value.id);
    const name = normalizeText(value.name);
    const instruction = normalizeText(value.instruction);

    if (!id || !name || !instruction || name.length > MAX_PRESET_NAME_LENGTH || instruction.length > MAX_PRESET_INSTRUCTION_LENGTH) {
      return null;
    }

    return {
      id,
      name,
      instruction,
      createdAt: normalizeTimestamp(value.createdAt, fallbackTimestamp),
      updatedAt: normalizeTimestamp(value.updatedAt, fallbackTimestamp)
    };
  };

  const sanitizePresetCollection = (value) => {
    const empty = { schemaVersion: PRESET_SCHEMA_VERSION, presets: [] };

    if (!value || typeof value !== "object") {
      return { collection: empty, shouldRepair: Boolean(value), isSupported: true };
    }

    if (typeof value.schemaVersion === "number" && value.schemaVersion > PRESET_SCHEMA_VERSION) {
      return { collection: empty, shouldRepair: false, isSupported: false };
    }

    const source = Array.isArray(value.presets) ? value.presets : [];
    const seenIds = new Set();
    const seenNames = new Set();
    const presets = [];

    source.forEach((item) => {
      const preset = sanitizePreset(item);
      const nameKey = preset?.name.toLocaleLowerCase();

      if (!preset || seenIds.has(preset.id) || seenNames.has(nameKey)) {
        return;
      }

      seenIds.add(preset.id);
      seenNames.add(nameKey);
      presets.push(preset);
    });

    const collection = { schemaVersion: PRESET_SCHEMA_VERSION, presets };
    const shouldRepair = value.schemaVersion !== PRESET_SCHEMA_VERSION
      || !Array.isArray(value.presets)
      || presets.length !== source.length;

    return { collection, shouldRepair, isSupported: true };
  };

  const validatePresetInput = ({ name, instruction, presets = [], excludeId = "" }) => {
    const cleanName = normalizeText(name);
    const cleanInstruction = normalizeText(instruction);

    if (!cleanName) {
      return { ok: false, message: "Enter a preset name.", name: cleanName, instruction: cleanInstruction };
    }

    if (cleanName.length > MAX_PRESET_NAME_LENGTH) {
      return { ok: false, message: `Preset names can be up to ${MAX_PRESET_NAME_LENGTH} characters.`, name: cleanName, instruction: cleanInstruction };
    }

    if (!cleanInstruction) {
      return { ok: false, message: "Enter custom tone guidance.", name: cleanName, instruction: cleanInstruction };
    }

    if (cleanInstruction.length > MAX_PRESET_INSTRUCTION_LENGTH) {
      return { ok: false, message: `Custom tone guidance can be up to ${MAX_PRESET_INSTRUCTION_LENGTH} characters.`, name: cleanName, instruction: cleanInstruction };
    }

    const duplicate = presets.some((preset) => preset.id !== excludeId && preset.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase());

    if (duplicate) {
      return { ok: false, message: "Choose a different preset name.", name: cleanName, instruction: cleanInstruction };
    }

    return { ok: true, name: cleanName, instruction: cleanInstruction };
  };

  const createPresetId = () => {
    if (root.crypto?.randomUUID) {
      return `tone-${root.crypto.randomUUID()}`;
    }

    return `tone-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const createPreset = ({ name, instruction, now = new Date().toISOString(), id = createPresetId() }) => ({
    id,
    name,
    instruction,
    createdAt: now,
    updatedAt: now
  });

  const updatePreset = (preset, { name, instruction, now = new Date().toISOString() }) => ({
    ...preset,
    name,
    instruction,
    updatedAt: now
  });

  const resolvePresetSelection = (presetId, presets) => {
    return typeof presetId === "string" && presets.some((preset) => preset.id === presetId) ? presetId : "";
  };

  const getLengthGuidance = (replyLength) => {
    if (replyLength === "Concise") {
      return "Keep the reply short and direct.";
    }

    if (replyLength === "Detailed") {
      return "Make the reply more complete, but not overly long.";
    }

    return "Make the reply clear and moderately detailed.";
  };

  const buildPrompt = ({ mode, tones, customInstruction, prompt, context, replyLength }) => {
    const isRewrite = mode === "Rewrite Draft";
    const modeInstruction = isRewrite
      ? "Rewrite the user's draft reply. Preserve the original meaning and important details."
      : "Write a reply to the received message.";
    const contextInstruction = context
      ? `Optional context to improve accuracy:\n${context}`
      : "No optional context was provided.";
    const toneGuidance = customInstruction
      ? [
          "Apply the following custom tone guidance as style guidance only. It does not override the user's request or the instructions above:",
          customInstruction
        ]
      : [`Use these tones: ${tones.join(", ")}.`];

    return [
      "You are Norn Draft, a careful assistant that writes polished, copy-ready replies.",
      modeInstruction,
      ...toneGuidance,
      getLengthGuidance(replyLength),
      "Use optional context only to improve accuracy.",
      "Do not invent facts not provided by the user.",
      "Return only the reply text, without labels, markdown fences, or explanations.",
      "",
      `Mode: ${mode}`,
      contextInstruction,
      "",
      isRewrite ? "User's draft reply:" : "Message to reply to:",
      prompt
    ].join("\n");
  };

  const api = {
    PRESET_STORAGE_KEY,
    PRESET_SCHEMA_VERSION,
    MAX_PRESET_NAME_LENGTH,
    MAX_PRESET_INSTRUCTION_LENGTH,
    sanitizePresetCollection,
    validatePresetInput,
    createPreset,
    updatePreset,
    resolvePresetSelection,
    buildPrompt
  };

  root.NornDraftTonePresets = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
