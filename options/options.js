document.addEventListener("DOMContentLoaded", () => {
  const sidePanelPreferenceKey = window.NornDraftSidePanel.SIDE_PANEL_PREFERENCE_KEY;
  const modelConfig = window.NornDraftModelConfig;
  const modelDiscovery = window.NornDraftModelDiscovery;
  const draftLimits = window.NornDraftDraftLimits;
  const defaults = {
    provider: "Gemini",
    apiKey: "",
    geminiApiKey: "",
    openaiApiKey: "",
    defaultTone: "Professional",
    replyLength: "Balanced",
    promptMaxCharacters: draftLimits.DRAFT_LIMITS.prompt.defaultValue,
    contextMaxCharacters: draftLimits.DRAFT_LIMITS.context.defaultValue,
    geminiModelPreset: "auto",
    geminiCustomModel: "",
    openaiModelPreset: "recommended",
    openaiCustomModel: "",
    historyEnabled: false,
    historyDetailLevel: "basic",
    historyLimit: "10",
    [sidePanelPreferenceKey]: false
  };
  const replyHistoryStorageKey = "nornDraftReplyHistory";
  const popupDraftStorageKey = "nornDraftPopupDraftState";
  const presetStorageKey = window.NornDraftTonePresets.PRESET_STORAGE_KEY;

  const form = document.querySelector("#settings-form");
  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  const apiKeyInput = document.querySelector("#api-key");
  const apiKeyLabel = document.querySelector("#api-key-label");
  const toggleApiKeyButton = document.querySelector("#toggle-api-key");
  const clearApiKeyButton = document.querySelector("#clear-api-key");
  const resetSettingsButton = document.querySelector("#reset-settings");
  const defaultToneSelect = document.querySelector("#default-tone");
  const replyLengthSelect = document.querySelector("#reply-length");
  const promptMaxCharactersInput = document.querySelector("#prompt-max-characters");
  const contextMaxCharactersInput = document.querySelector("#context-max-characters");
  const geminiModelPanel = document.querySelector("#gemini-model-panel");
  const geminiModelPresetSelect = document.querySelector("#gemini-model-preset");
  const geminiCustomModelInput = document.querySelector("#gemini-custom-model");
  const openaiModelPanel = document.querySelector("#openai-model-panel");
  const openaiModelPresetSelect = document.querySelector("#openai-model-preset");
  const openaiCustomModelInput = document.querySelector("#openai-custom-model");
  const refreshGeminiModelsButton = document.querySelector("#refresh-gemini-models");
  const refreshOpenAiModelsButton = document.querySelector("#refresh-openai-models");
  const geminiDiscoveryStatus = document.querySelector("#gemini-model-discovery-status");
  const openaiDiscoveryStatus = document.querySelector("#openai-model-discovery-status");
  const geminiModelInfo = document.querySelector("#gemini-model-info");
  const openaiModelInfo = document.querySelector("#openai-model-info");
  const historyEnabledInput = document.querySelector("#history-enabled");
  const historyLimitSelect = document.querySelector("#history-limit");
  const openInSidePanelInput = document.querySelector("#open-in-side-panel");
  const clearHistoryButton = document.querySelector("#clear-history");
  const historyList = document.querySelector("#options-history-list");
  const addPresetButton = document.querySelector("#add-preset");
  const presetList = document.querySelector("#preset-list");
  const presetEmptyState = document.querySelector("#preset-empty-state");
  const presetEditor = document.querySelector("#preset-editor");
  const presetEditorTitle = document.querySelector("#preset-editor-title");
  const presetNameInput = document.querySelector("#preset-name");
  const presetInstructionInput = document.querySelector("#preset-instruction");
  const presetCharacterCount = document.querySelector("#preset-character-count");
  const presetEditorStatus = document.querySelector("#preset-editor-status");
  const savePresetButton = document.querySelector("#save-preset");
  const cancelPresetButton = document.querySelector("#cancel-preset");
  const status = document.querySelector("#status");

  const storage = chrome.storage.local;
  let statusTimeoutId = null;
  let currentSettings = { ...defaults };
  let activeProvider = defaults.provider;
  let replyHistory = [];
  let customPresets = [];
  let editingPresetId = "";
  let discoveredModels = {};
  let modelCache = {};
  const refreshingProviders = new Set();
  const geminiModelPresets = modelConfig.getPresetIds("Gemini");
  const openaiModelPresets = modelConfig.getPresetIds("OpenAI");
  const validHistoryDetailLevels = ["basic", "detailed"];
  const validModes = ["Generate Reply", "Rewrite Draft"];
  const validTones = ["Professional", "Friendly", "Empathetic", "Instructional", "Short", "Detailed"];

  const populateModelSelect = (select, provider, selectedValue = "") => {
    const config = modelConfig.getProviderConfig(provider);
    const options = config.presets.map((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      return option;
    });
    (discoveredModels[provider] || []).forEach((model) => {
      const option = document.createElement("option");
      option.value = `discovered:${model.id}`;
      option.textContent = `${model.label} (available to this key)`;
      options.push(option);
    });
    const customOption = document.createElement("option");
    customOption.value = modelConfig.CUSTOM_PRESET_ID;
    customOption.textContent = "Custom model name";
    options.push(customOption);
    select.replaceChildren(...options);
    select.value = selectedValue && Array.from(select.options).some((option) => option.value === selectedValue)
      ? selectedValue
      : select.value;
  };

  populateModelSelect(geminiModelPresetSelect, "Gemini");
  populateModelSelect(openaiModelPresetSelect, "OpenAI");

  const populateDiscoveredModels = () => {
    const geminiSelection = geminiModelPresetSelect.value;
    const openAiSelection = openaiModelPresetSelect.value;
    populateModelSelect(geminiModelPresetSelect, "Gemini", geminiSelection);
    populateModelSelect(openaiModelPresetSelect, "OpenAI", openAiSelection);
  };

  const setDiscoveryStatus = (provider, message) => {
    (provider === "OpenAI" ? openaiDiscoveryStatus : geminiDiscoveryStatus).textContent = message;
  };

  const formatDiscoveryTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp));
    return Number.isNaN(date.getTime()) ? "unknown time" : date.toLocaleString();
  };

  const getLastRefreshMessage = (provider) => {
    const fetchedAt = modelCache?.[provider]?.fetchedAt;
    return Number.isFinite(Number(fetchedAt)) ? ` Last refreshed ${formatDiscoveryTimestamp(fetchedAt)}.` : "";
  };

  const renderModelInfo = (provider) => {
    const isOpenAi = provider === "OpenAI";
    const select = isOpenAi ? openaiModelPresetSelect : geminiModelPresetSelect;
    const customInput = isOpenAi ? openaiCustomModelInput : geminiCustomModelInput;
    const target = isOpenAi ? openaiModelInfo : geminiModelInfo;
    const info = modelConfig.getModelInfo(provider, select.value, customInput.value, discoveredModels[provider] || []);
    const estimateNote = info.isEstimated ? " Estimated profile; check the provider's current pricing and model documentation." : "";
    target.textContent = `${info.description} ${info.profile}.${estimateNote}`;
  };

  const refreshModels = async (provider, button) => {
    if (refreshingProviders.has(provider)) {
      return;
    }

    const cooldownRemaining = modelDiscovery.getCooldownRemaining(modelCache, provider);
    if (cooldownRemaining > 0) {
      const seconds = Math.ceil(cooldownRemaining / 1000);
      const minutes = Math.ceil(seconds / 60);
      const shouldRefreshAgain = window.confirm(
        `${provider} models were already refreshed${getLastRefreshMessage(provider)}\n\n` +
        `Another refresh will make another model-list API request. Refresh again anyway? ` +
        `The normal cooldown ends in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
      );
      if (!shouldRefreshAgain) {
        setDiscoveryStatus(provider, `Refresh cancelled. Models were already refreshed${getLastRefreshMessage(provider)}`);
        return;
      }
    }

    const apiKey = provider === "OpenAI" ? currentSettings.openaiApiKey : currentSettings.geminiApiKey;
    if (!apiKey) {
      setDiscoveryStatus(provider, `Add a ${provider} API key before refreshing.`);
      return;
    }
    refreshingProviders.add(provider);
    button.disabled = true;
    setDiscoveryStatus(provider, "Refreshing available models...");
    try {
      const models = await modelDiscovery.discoverModels({ provider, apiKey });
      modelCache = await modelDiscovery.writeCachedModels(storage, modelCache, provider, models);
      discoveredModels[provider] = models;
      populateDiscoveredModels();
      renderModelInfo(provider);
      setDiscoveryStatus(provider, `${models.length} usable model${models.length === 1 ? "" : "s"} found. Cached for 24 hours.${getLastRefreshMessage(provider)}`);
    } catch (error) {
      setDiscoveryStatus(provider, "Could not refresh models. Built-in presets remain available.");
    } finally {
      refreshingProviders.delete(provider);
      button.disabled = false;
    }
  };

  const loadDiscoveredModels = async () => {
    try {
      modelCache = await modelDiscovery.readCache(storage);
      discoveredModels = {
        Gemini: modelDiscovery.getFreshCachedModels(modelCache, "Gemini"),
        OpenAI: modelDiscovery.getFreshCachedModels(modelCache, "OpenAI")
      };
      populateDiscoveredModels();
      Object.keys(discoveredModels).forEach((provider) => {
        if (discoveredModels[provider].length || modelCache?.[provider]?.fetchedAt) {
          setDiscoveryStatus(provider, `${discoveredModels[provider].length} cached model${discoveredModels[provider].length === 1 ? "" : "s"} available.${getLastRefreshMessage(provider)}`);
        }
      });
    } catch (error) {
      discoveredModels = {};
    }
  };

  const isAvailableModelPreset = (select, value) => Array.from(select.options).some((option) => option.value === value);

  const getHistoryLimit = () => {
    return currentSettings.historyLimit === "20" ? 20 : 10;
  };

  const clearStatusTimer = () => {
    if (statusTimeoutId) {
      window.clearTimeout(statusTimeoutId);
      statusTimeoutId = null;
    }
  };

  const getStatusDuration = (type, duration) => {
    if (duration !== undefined) {
      return duration;
    }

    if (type === "success") {
      return 3000;
    }

    if (type === "validation") {
      return 4000;
    }

    if (type === "error") {
      return 7000;
    }

    return 0;
  };

  const setStatus = (message, type, options = {}) => {
    clearStatusTimer();
    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (type === "validation") {
      status.classList.add("is-error");
    } else if (type) {
      status.classList.add(`is-${type}`);
    }

    if (!message || options.persist) {
      return;
    }

    const duration = getStatusDuration(type, options.duration);

    if (duration > 0) {
      statusTimeoutId = window.setTimeout(() => {
        status.textContent = "";
        status.classList.remove("is-success", "is-error");
        statusTimeoutId = null;
      }, duration);
    }
  };

  const getSelectedProvider = () => {
    return form.elements.provider.value;
  };

  const setSelectedProvider = (provider) => {
    const providerInput = form.querySelector(`input[name="provider"][value="${provider}"]`);
    if (providerInput) {
      providerInput.checked = true;
    }
  };

  const getProviderApiKeySetting = (provider) => {
    return provider === "OpenAI" ? "openaiApiKey" : "geminiApiKey";
  };

  const getProviderLabel = (provider) => {
    return provider === "OpenAI" ? "OpenAI" : "Gemini";
  };

  const syncCurrentApiKeyToSettings = () => {
    const keyName = getProviderApiKeySetting(activeProvider);
    currentSettings[keyName] = apiKeyInput.value.trim();
  };

  const syncApiKeyField = () => {
    const provider = getSelectedProvider();
    const providerLabel = getProviderLabel(provider);
    const keyName = getProviderApiKeySetting(provider);

    activeProvider = provider;
    apiKeyLabel.textContent = `${providerLabel} API key`;
    apiKeyInput.value = currentSettings[keyName] || "";
    apiKeyInput.placeholder = `Enter your ${providerLabel} API key`;
    clearApiKeyButton.textContent = `Clear ${providerLabel} API Key`;
    apiKeyInput.type = "password";
    toggleApiKeyButton.textContent = "Show";
  };

  const getSelectedHistoryDetailLevel = () => {
    return form.elements.historyDetailLevel.value;
  };

  const setSelectedHistoryDetailLevel = (detailLevel) => {
    const cleanDetailLevel = validHistoryDetailLevels.includes(detailLevel) ? detailLevel : defaults.historyDetailLevel;
    const detailInput = form.querySelector(`input[name="historyDetailLevel"][value="${cleanDetailLevel}"]`);

    if (detailInput) {
      detailInput.checked = true;
    }
  };

  const setActiveTab = (tabName) => {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tabName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === tabName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  const syncCustomModelInput = () => {
    const isCustomModel = geminiModelPresetSelect.value === "custom";
    geminiCustomModelInput.disabled = !isCustomModel;
    geminiCustomModelInput.setAttribute("aria-disabled", String(!isCustomModel));
  };

  const syncOpenAiCustomModelInput = () => {
    const isCustomModel = openaiModelPresetSelect.value === "custom";
    openaiCustomModelInput.disabled = !isCustomModel;
    openaiCustomModelInput.setAttribute("aria-disabled", String(!isCustomModel));
  };

  const syncProviderModelSections = () => {
    const isGemini = getSelectedProvider() === "Gemini";
    geminiModelPanel.hidden = !isGemini;
    openaiModelPanel.hidden = isGemini;
  };

  const migrateLegacyApiKey = async (settings) => {
    const legacyApiKey = typeof settings.apiKey === "string" ? settings.apiKey.trim() : "";
    const provider = settings.provider === "OpenAI" ? "OpenAI" : "Gemini";
    const providerKeyName = getProviderApiKeySetting(provider);

    if (!legacyApiKey || settings[providerKeyName]) {
      return settings;
    }

    const migratedSettings = {
      ...settings,
      [providerKeyName]: legacyApiKey,
      apiKey: ""
    };

    // Migrate the old shared key only to the currently selected provider so a
    // Gemini key is never silently copied into OpenAI, or vice versa.
    await storage.set({
      [providerKeyName]: legacyApiKey,
      apiKey: ""
    });

    return migratedSettings;
  };

  const escapeHtml = (value) => {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  };

  const getDefaultPopupTone = () => {
    return validTones.includes(currentSettings.defaultTone) ? currentSettings.defaultTone : defaults.defaultTone;
  };

  const setPresetEditorMessage = (message, isError = false) => {
    presetEditorStatus.textContent = message;
    presetEditorStatus.classList.toggle("is-error", isError);
  };

  const updatePresetEditorValidity = () => {
    const validation = window.NornDraftTonePresets.validatePresetInput({
      name: presetNameInput.value,
      instruction: presetInstructionInput.value,
      presets: customPresets,
      excludeId: editingPresetId
    });

    presetCharacterCount.textContent = `${presetInstructionInput.value.length} / ${window.NornDraftTonePresets.MAX_PRESET_INSTRUCTION_LENGTH} characters`;
    savePresetButton.disabled = !validation.ok;

    if (presetNameInput.value.trim() || presetInstructionInput.value.trim()) {
      setPresetEditorMessage(validation.ok ? "" : validation.message, !validation.ok);
    } else {
      setPresetEditorMessage("");
    }

    return validation;
  };

  const closePresetEditor = () => {
    editingPresetId = "";
    presetEditor.hidden = true;
    presetNameInput.value = "";
    presetInstructionInput.value = "";
    presetCharacterCount.textContent = `0 / ${window.NornDraftTonePresets.MAX_PRESET_INSTRUCTION_LENGTH} characters`;
    setPresetEditorMessage("");
    savePresetButton.disabled = true;
  };

  const openPresetEditor = (preset) => {
    editingPresetId = preset?.id || "";
    presetEditorTitle.textContent = preset ? "Edit custom preset" : "New custom preset";
    presetNameInput.value = preset?.name || "";
    presetInstructionInput.value = preset?.instruction || "";
    presetEditor.hidden = false;
    updatePresetEditorValidity();
    presetNameInput.focus();
  };

  const renderPresetList = () => {
    presetList.replaceChildren();
    presetEmptyState.hidden = customPresets.length > 0;

    customPresets.forEach((preset) => {
      const card = document.createElement("article");
      card.className = "preset-card";
      card.dataset.presetId = preset.id;

      const header = document.createElement("div");
      header.className = "preset-card__header";
      const name = document.createElement("h3");
      name.className = "preset-card__name";
      name.textContent = preset.name;
      const actions = document.createElement("div");
      actions.className = "preset-card__actions";

      [
        ["edit", "Edit"],
        ["delete", "Delete"]
      ].forEach(([action, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button--secondary";
        button.dataset.presetAction = action;
        button.textContent = label;
        button.setAttribute("aria-label", `${label} ${preset.name}`);
        actions.append(button);
      });

      const instruction = document.createElement("p");
      instruction.className = "preset-card__instruction";
      instruction.textContent = preset.instruction;
      header.append(name, actions);
      card.append(header, instruction);
      presetList.append(card);
    });
  };

  const saveCustomPresets = async () => {
    await storage.set({
      [presetStorageKey]: {
        schemaVersion: window.NornDraftTonePresets.PRESET_SCHEMA_VERSION,
        presets: customPresets
      }
    });
  };

  const loadCustomPresets = async () => {
    try {
      const stored = await storage.get(presetStorageKey);
      const result = window.NornDraftTonePresets.sanitizePresetCollection(stored[presetStorageKey]);
      customPresets = result.collection.presets;

      // Repair malformed version 1 records once without touching unrelated settings.
      if (result.shouldRepair && result.isSupported) {
        await storage.set({ [presetStorageKey]: result.collection });
      }
    } catch (error) {
      customPresets = [];
    }

    renderPresetList();
  };

  const clearDeletedPresetFromPopupDraft = async (presetId) => {
    const stored = await storage.get(popupDraftStorageKey);
    const draft = stored[popupDraftStorageKey];

    if (!draft || typeof draft !== "object" || draft.selectedPresetId !== presetId) {
      return;
    }

    await storage.set({
      [popupDraftStorageKey]: {
        ...draft,
        selectedPresetId: "",
        selectedTones: [getDefaultPopupTone()]
      }
    });
  };

  const formatHistoryDate = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const sanitizeTones = (tones) => {
    if (!Array.isArray(tones)) {
      return [defaults.defaultTone];
    }

    const cleanTones = tones.filter((tone, index) => {
      return validTones.includes(tone) && tones.indexOf(tone) === index;
    });

    return cleanTones.length > 0 ? cleanTones : [defaults.defaultTone];
  };

  const sanitizeHistoryItems = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item) => {
        return item
          && typeof item === "object"
          && typeof item.id === "string"
          && typeof item.reply === "string"
          && item.reply.trim();
      })
      .map((item) => ({
        id: item.id,
        reply: item.reply,
        provider: typeof item.provider === "string" ? item.provider : "Unknown",
        model: typeof item.model === "string" ? item.model : "Unknown model",
        mode: validModes.includes(item.mode) ? item.mode : "Generate Reply",
        tones: sanitizeTones(item.tones),
        replyLength: typeof item.replyLength === "string" ? item.replyLength : defaults.replyLength,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString(),
        detailLevel: item.detailLevel === "detailed" ? "detailed" : "basic",
        inputText: typeof item.inputText === "string" ? item.inputText : "",
        context: typeof item.context === "string" ? item.context : ""
      }))
      .slice(0, getHistoryLimit());
  };

  const renderHistory = () => {
    if (!currentSettings.historyEnabled) {
      historyList.innerHTML = '<p class="history-manager__empty">Local reply history is off. Enable it to save generated replies.</p>';
      clearHistoryButton.hidden = replyHistory.length === 0;
      return;
    }

    if (replyHistory.length === 0) {
      historyList.innerHTML = '<p class="history-manager__empty">No saved replies yet.</p>';
      clearHistoryButton.hidden = true;
      return;
    }

    clearHistoryButton.hidden = false;
    historyList.innerHTML = replyHistory
      .map((item) => {
        const meta = [
          formatHistoryDate(item.timestamp),
          `${item.provider} / ${item.model}`,
          item.mode,
          `Tones: ${item.tones.join(", ")}`,
          `Length: ${item.replyLength}`
        ].join(" - ");
        const detailedSections = item.detailLevel === "detailed"
          ? `
            <div class="history-record__section">
              <p class="history-record__label">Message / draft</p>
              <p class="history-record__text">${escapeHtml(item.inputText || "No message or draft saved.")}</p>
            </div>
            ${item.context ? `
              <div class="history-record__section">
                <p class="history-record__label">Context / details</p>
                <p class="history-record__text">${escapeHtml(item.context)}</p>
              </div>
            ` : ""}
          `
          : "";

        return `
          <article class="history-record" data-history-id="${escapeHtml(item.id)}">
            <p class="history-record__meta">${escapeHtml(meta)}</p>
            ${detailedSections}
            <div class="history-record__section">
              <p class="history-record__label">Generated reply</p>
              <p class="history-record__text">${escapeHtml(item.reply)}</p>
            </div>
            <div class="history-record__actions">
              <button class="button button--secondary" type="button" data-history-action="copy">Copy reply</button>
              <button class="button button--secondary" type="button" data-history-action="restore">Restore reply</button>
              <button class="button button--secondary" type="button" data-history-action="delete">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const loadReplyHistory = async () => {
    try {
      const stored = await storage.get(replyHistoryStorageKey);
      replyHistory = sanitizeHistoryItems(stored[replyHistoryStorageKey]);
    } catch (error) {
      replyHistory = [];
    }

    renderHistory();
  };

  const saveReplyHistory = async () => {
    await storage.set({ [replyHistoryStorageKey]: replyHistory.slice(0, getHistoryLimit()) });
  };

  const readFormSettings = () => {
    syncCurrentApiKeyToSettings();

    return {
      provider: getSelectedProvider(),
      apiKey: "",
      geminiApiKey: currentSettings.geminiApiKey || "",
      openaiApiKey: currentSettings.openaiApiKey || "",
      defaultTone: defaultToneSelect.value,
      replyLength: replyLengthSelect.value,
      promptMaxCharacters: draftLimits.getLimit("prompt", promptMaxCharactersInput.value),
      contextMaxCharacters: draftLimits.getLimit("context", contextMaxCharactersInput.value),
      geminiModelPreset: geminiModelPresetSelect.value,
      geminiCustomModel: geminiCustomModelInput.value.trim(),
      openaiModelPreset: openaiModelPresetSelect.value,
      openaiCustomModel: openaiCustomModelInput.value.trim(),
      historyEnabled: historyEnabledInput.checked,
      historyDetailLevel: getSelectedHistoryDetailLevel(),
      historyLimit: historyLimitSelect.value,
      [sidePanelPreferenceKey]: openInSidePanelInput.checked
    };
  };

  const applySettings = (settings) => {
    currentSettings = { ...defaults, ...settings };
    currentSettings.historyDetailLevel = validHistoryDetailLevels.includes(currentSettings.historyDetailLevel)
      ? currentSettings.historyDetailLevel
      : defaults.historyDetailLevel;

    setSelectedProvider(currentSettings.provider);
    defaultToneSelect.value = currentSettings.defaultTone;
    replyLengthSelect.value = currentSettings.replyLength;
    currentSettings.promptMaxCharacters = draftLimits.getLimit("prompt", currentSettings.promptMaxCharacters);
    currentSettings.contextMaxCharacters = draftLimits.getLimit("context", currentSettings.contextMaxCharacters);
    promptMaxCharactersInput.value = currentSettings.promptMaxCharacters;
    contextMaxCharactersInput.value = currentSettings.contextMaxCharacters;
    geminiModelPresetSelect.value = isAvailableModelPreset(geminiModelPresetSelect, currentSettings.geminiModelPreset)
      ? currentSettings.geminiModelPreset
      : defaults.geminiModelPreset;
    geminiCustomModelInput.value = currentSettings.geminiCustomModel;
    openaiModelPresetSelect.value = isAvailableModelPreset(openaiModelPresetSelect, currentSettings.openaiModelPreset)
      ? currentSettings.openaiModelPreset
      : defaults.openaiModelPreset;
    openaiCustomModelInput.value = currentSettings.openaiCustomModel;
    historyEnabledInput.checked = Boolean(currentSettings.historyEnabled);
    setSelectedHistoryDetailLevel(currentSettings.historyDetailLevel);
    historyLimitSelect.value = currentSettings.historyLimit === "20" ? "20" : defaults.historyLimit;
    openInSidePanelInput.checked = currentSettings[sidePanelPreferenceKey] === true;
    syncCustomModelInput();
    syncOpenAiCustomModelInput();
    syncProviderModelSections();
    syncApiKeyField();
    renderModelInfo("Gemini");
    renderModelInfo("OpenAI");
    renderHistory();
  };

  const loadSettings = async () => {
    try {
      await window.NornDraftSidePanel.migrateSidePanelPreference({ storage, logger: console });
      const savedSettings = await storage.get(defaults);
      const migratedSettings = await migrateLegacyApiKey({ ...defaults, ...savedSettings });
      applySettings(migratedSettings);
      setStatus("Settings loaded.", "success");
    } catch (error) {
      applySettings(defaults);
      setStatus("Settings could not load, so defaults are shown.", "error");
    }
  };

  const restoreReplyToPopupDraft = async (item) => {
    const stored = await storage.get(popupDraftStorageKey);
    const existingDraft = stored[popupDraftStorageKey];
    const nextDraft = existingDraft && typeof existingDraft === "object"
      ? { ...existingDraft, generatedReply: item.reply }
      : {
          selectedMode: "Generate Reply",
          selectedTones: [currentSettings.defaultTone || defaults.defaultTone],
          prompt: "",
          context: "",
          generatedReply: item.reply
        };

    await storage.set({ [popupDraftStorageKey]: nextDraft });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = readFormSettings();
    const isGeminiProvider = settings.provider === "Gemini";

    if (isGeminiProvider && settings.geminiModelPreset === "custom" && !settings.geminiCustomModel) {
      setActiveTab("models");
      setStatus("Please enter a custom Gemini model name or choose a preset model.", "validation");
      geminiCustomModelInput.focus();
      return;
    }

    if (!isGeminiProvider && settings.openaiModelPreset === "custom" && !settings.openaiCustomModel) {
      setActiveTab("models");
      setStatus("Please enter a custom OpenAI model name or choose a preset model.", "validation");
      openaiCustomModelInput.focus();
      return;
    }

    try {
      await storage.set(settings);
      currentSettings = { ...defaults, ...settings };
      replyHistory = replyHistory.slice(0, getHistoryLimit());
      await saveReplyHistory();
      renderHistory();
      setStatus("Settings saved locally.", "success");
    } catch (error) {
      setStatus("Settings could not be saved. Please try again.", "error");
    }
  });

  addPresetButton.addEventListener("click", () => {
    openPresetEditor(null);
  });

  cancelPresetButton.addEventListener("click", () => {
    closePresetEditor();
  });

  presetNameInput.addEventListener("input", updatePresetEditorValidity);
  presetInstructionInput.addEventListener("input", updatePresetEditorValidity);

  savePresetButton.addEventListener("click", async () => {
    const validation = updatePresetEditorValidity();

    if (!validation.ok) {
      setPresetEditorMessage(validation.message, true);
      return;
    }

    const existingPreset = customPresets.find((preset) => preset.id === editingPresetId);
    const nextPreset = existingPreset
      ? window.NornDraftTonePresets.updatePreset(existingPreset, validation)
      : window.NornDraftTonePresets.createPreset(validation);

    customPresets = existingPreset
      ? customPresets.map((preset) => preset.id === existingPreset.id ? nextPreset : preset)
      : [...customPresets, nextPreset];

    try {
      await saveCustomPresets();
      renderPresetList();
      closePresetEditor();
      setStatus(existingPreset ? "Custom preset updated locally." : "Custom preset saved locally.", "success");
    } catch (error) {
      customPresets = existingPreset
        ? customPresets.map((preset) => preset.id === nextPreset.id ? existingPreset : preset)
        : customPresets.filter((preset) => preset.id !== nextPreset.id);
      renderPresetList();
      setPresetEditorMessage("Custom preset could not be saved. Please try again.", true);
    }
  });

  presetList.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-preset-action]");

    if (!actionButton) {
      return;
    }

    const card = actionButton.closest("[data-preset-id]");
    const preset = customPresets.find((entry) => entry.id === card?.dataset.presetId);

    if (!preset) {
      setStatus("That custom preset is no longer available.", "validation");
      return;
    }

    if (actionButton.dataset.presetAction === "edit") {
      openPresetEditor(preset);
      return;
    }

    if (!window.confirm(`Delete “${preset.name}”? This cannot be undone.`)) {
      return;
    }

    const previousPresets = customPresets;
    customPresets = customPresets.filter((entry) => entry.id !== preset.id);

    try {
      await saveCustomPresets();
    } catch (error) {
      customPresets = previousPresets;
      renderPresetList();
      setStatus("Custom preset could not be deleted. Please try again.", "error");
      return;
    }

    renderPresetList();
    if (editingPresetId === preset.id) {
      closePresetEditor();
    }

    try {
      await clearDeletedPresetFromPopupDraft(preset.id);
      setStatus("Custom preset deleted.", "success");
    } catch (error) {
      setStatus("Custom preset deleted. The popup will reset its selection when it next opens.", "success");
    }
  });

  toggleApiKeyButton.addEventListener("click", () => {
    const isHidden = apiKeyInput.type === "password";
    apiKeyInput.type = isHidden ? "text" : "password";
    toggleApiKeyButton.textContent = isHidden ? "Hide" : "Show";
  });

  clearApiKeyButton.addEventListener("click", async () => {
    const provider = getSelectedProvider();
    const providerLabel = getProviderLabel(provider);
    const keyName = getProviderApiKeySetting(provider);
    apiKeyInput.value = "";

    try {
      await storage.set({ [keyName]: "", apiKey: "" });
      currentSettings[keyName] = "";
      currentSettings.apiKey = "";
      setStatus(`${providerLabel} API key cleared from local storage.`, "success");
    } catch (error) {
      setStatus(`${providerLabel} API key could not be cleared. Please try again.`, "error");
    }
  });

  resetSettingsButton.addEventListener("click", async () => {
    applySettings(defaults);

    try {
      await storage.set(defaults);
      setStatus("Settings reset to defaults.", "success");
    } catch (error) {
      setStatus("Settings could not be reset. Please try again.", "error");
    }
  });

  clearHistoryButton.addEventListener("click", async () => {
    try {
      replyHistory = [];
      await storage.set({ [replyHistoryStorageKey]: [] });
      renderHistory();
      setStatus("Reply history cleared.", "success");
    } catch (error) {
      setStatus("Reply history could not be cleared. Please try again.", "error");
    }
  });

  historyList.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-history-action]");

    if (!actionButton) {
      return;
    }

    const historyItem = actionButton.closest("[data-history-id]");
    const item = replyHistory.find((entry) => entry.id === historyItem?.dataset.historyId);

    if (!item) {
      setStatus("That history item is no longer available.", "validation");
      return;
    }

    const action = actionButton.dataset.historyAction;

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(item.reply);
        setStatus("History reply copied to clipboard.", "success");
      } catch (error) {
        setStatus("Clipboard copy was not available. Select the reply text and copy it manually.", "error");
      }
      return;
    }

    if (action === "restore") {
      try {
        await restoreReplyToPopupDraft(item);
        setStatus("Reply restored. Open the popup to view it.", "success");
      } catch (error) {
        setStatus("Reply could not be restored. Please try again.", "error");
      }
      return;
    }

    if (action === "delete") {
      replyHistory = replyHistory.filter((entry) => entry.id !== item.id);

      try {
        await saveReplyHistory();
        renderHistory();
        setStatus("History item deleted.", "success");
      } catch (error) {
        setStatus("History item could not be deleted. Please try again.", "error");
      }
    }
  });

  geminiModelPresetSelect.addEventListener("change", () => {
    syncCustomModelInput();
    renderModelInfo("Gemini");
  });

  openaiModelPresetSelect.addEventListener("change", () => {
    syncOpenAiCustomModelInput();
    renderModelInfo("OpenAI");
  });

  geminiCustomModelInput.addEventListener("input", () => renderModelInfo("Gemini"));
  openaiCustomModelInput.addEventListener("input", () => renderModelInfo("OpenAI"));

  refreshGeminiModelsButton.addEventListener("click", () => refreshModels("Gemini", refreshGeminiModelsButton));
  refreshOpenAiModelsButton.addEventListener("click", () => refreshModels("OpenAI", refreshOpenAiModelsButton));

  form.querySelectorAll('input[name="provider"]').forEach((providerInput) => {
    providerInput.addEventListener("change", () => {
      syncCurrentApiKeyToSettings();
      currentSettings.provider = getSelectedProvider();
      syncProviderModelSections();
      syncApiKeyField();
    });
  });

  historyEnabledInput.addEventListener("change", () => {
    currentSettings.historyEnabled = historyEnabledInput.checked;
    renderHistory();
  });

  form.querySelectorAll('input[name="historyDetailLevel"]').forEach((detailInput) => {
    detailInput.addEventListener("change", () => {
      currentSettings.historyDetailLevel = getSelectedHistoryDetailLevel();
    });
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });

  loadDiscoveredModels()
    .then(loadSettings)
    .then(loadCustomPresets)
    .then(loadReplyHistory)
    .then(() => {
      setActiveTab("general");
    });
});
