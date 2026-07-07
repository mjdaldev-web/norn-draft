document.addEventListener("DOMContentLoaded", () => {
  const defaults = {
    provider: "Gemini",
    apiKey: "",
    geminiApiKey: "",
    openaiApiKey: "",
    defaultTone: "Professional",
    replyLength: "Balanced",
    geminiModelPreset: "auto",
    geminiCustomModel: "",
    openaiModelPreset: "recommended",
    openaiCustomModel: "",
    historyEnabled: false,
    historyDetailLevel: "basic",
    historyLimit: "10"
  };
  const replyHistoryStorageKey = "nornDraftReplyHistory";
  const popupDraftStorageKey = "nornDraftPopupDraftState";

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
  const geminiModelPanel = document.querySelector("#gemini-model-panel");
  const geminiModelPresetSelect = document.querySelector("#gemini-model-preset");
  const geminiCustomModelInput = document.querySelector("#gemini-custom-model");
  const openaiModelPanel = document.querySelector("#openai-model-panel");
  const openaiModelPresetSelect = document.querySelector("#openai-model-preset");
  const openaiCustomModelInput = document.querySelector("#openai-custom-model");
  const historyEnabledInput = document.querySelector("#history-enabled");
  const historyLimitSelect = document.querySelector("#history-limit");
  const clearHistoryButton = document.querySelector("#clear-history");
  const historyList = document.querySelector("#options-history-list");
  const status = document.querySelector("#status");

  const storage = chrome.storage.local;
  let statusTimeoutId = null;
  let currentSettings = { ...defaults };
  let activeProvider = defaults.provider;
  let replyHistory = [];
  const geminiModelPresets = ["auto", "flash-lite", "flash", "custom"];
  const openaiModelPresets = ["recommended", "mini", "quality", "custom"];
  const validHistoryDetailLevels = ["basic", "detailed"];
  const validModes = ["Generate Reply", "Rewrite Draft"];
  const validTones = ["Professional", "Friendly", "Empathetic", "Instructional", "Short", "Detailed"];

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
      geminiModelPreset: geminiModelPresetSelect.value,
      geminiCustomModel: geminiCustomModelInput.value.trim(),
      openaiModelPreset: openaiModelPresetSelect.value,
      openaiCustomModel: openaiCustomModelInput.value.trim(),
      historyEnabled: historyEnabledInput.checked,
      historyDetailLevel: getSelectedHistoryDetailLevel(),
      historyLimit: historyLimitSelect.value
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
    geminiModelPresetSelect.value = geminiModelPresets.includes(currentSettings.geminiModelPreset)
      ? currentSettings.geminiModelPreset
      : defaults.geminiModelPreset;
    geminiCustomModelInput.value = currentSettings.geminiCustomModel;
    openaiModelPresetSelect.value = openaiModelPresets.includes(currentSettings.openaiModelPreset)
      ? currentSettings.openaiModelPreset
      : defaults.openaiModelPreset;
    openaiCustomModelInput.value = currentSettings.openaiCustomModel;
    historyEnabledInput.checked = Boolean(currentSettings.historyEnabled);
    setSelectedHistoryDetailLevel(currentSettings.historyDetailLevel);
    historyLimitSelect.value = currentSettings.historyLimit === "20" ? "20" : defaults.historyLimit;
    syncCustomModelInput();
    syncOpenAiCustomModelInput();
    syncProviderModelSections();
    syncApiKeyField();
    renderHistory();
  };

  const loadSettings = async () => {
    try {
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
  });

  openaiModelPresetSelect.addEventListener("change", () => {
    syncOpenAiCustomModelInput();
  });

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

  loadSettings()
    .then(loadReplyHistory)
    .then(() => {
      setActiveTab("general");
    });
});
