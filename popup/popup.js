document.addEventListener("DOMContentLoaded", () => {
  const GEMINI_MODEL_PRESETS = {
    auto: "gemini-3.5-flash",
    "flash-lite": "gemini-3.1-flash-lite",
    flash: "gemini-3.5-flash"
  };
  const OPENAI_MODEL_PRESETS = {
    recommended: "gpt-5.4-mini",
    mini: "gpt-5.4-mini",
    quality: "gpt-5.5"
  };
  const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
  const POPUP_DRAFT_STORAGE_KEY = "nornDraftPopupDraftState";
  const REPLY_HISTORY_STORAGE_KEY = "nornDraftReplyHistory";
  const PRESET_STORAGE_KEY = window.NornDraftTonePresets.PRESET_STORAGE_KEY;
  const SELECTION_HANDOFF = window.NornDraftSelectionHandoff;
  const DEFAULT_HISTORY_LIMIT = 10;
  const DEFAULT_SETTINGS = {
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
    historyLimit: "10",
    nornDraftOpenInSidePanelByDefault: false
  };

  const toneChips = Array.from(document.querySelectorAll(".tone-chip"));
  const customPresetSelect = document.querySelector("#custom-preset");
  const modeOptions = Array.from(document.querySelectorAll(".mode-option"));
  const promptLabel = document.querySelector("#prompt-title");
  const promptHelp = document.querySelector("#prompt-help");
  const promptInput = document.querySelector("#prompt");
  const contextInput = document.querySelector("#context");
  const generateButton = document.querySelector("#generate");
  const clearButton = document.querySelector("#clear");
  const copyButton = document.querySelector("#copy");
  const clearHistoryButton = document.querySelector("#clear-history");
  const historyList = document.querySelector("#history-list");
  const settingsButton = document.querySelector("#settings");
  const openSidePanelButton = document.querySelector("#open-side-panel");
  const output = document.querySelector("#reply-output");
  const status = document.querySelector("#status");
  const initialOutputText = output.textContent.trim();
  const validModes = ["Generate Reply", "Rewrite Draft"];
  const validTones = toneChips.map((chip) => chip.dataset.tone);

  let selectedTones = ["Professional"];
  let selectedPresetId = "";
  let selectedMode = "Generate Reply";
  let generatedReply = "";
  let currentSettings = { ...DEFAULT_SETTINGS };
  let replyHistory = [];
  let customPresets = [];
  let statusTimeoutId = null;
  let saveDraftTimeoutId = null;
  let pendingSelectionPromise = null;
  let hasUnsavedDraftChanges = false;
  let lastSavedDraftAt = 0;

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

  const clearStatusTimer = () => {
    if (statusTimeoutId) {
      window.clearTimeout(statusTimeoutId);
      statusTimeoutId = null;
    }
  };

  const setStatus = (message, type, options = {}) => {
    clearStatusTimer();
    status.textContent = message;
    status.classList.remove("is-success", "is-error", "is-validation");

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
        status.classList.remove("is-success", "is-error", "is-validation");
        statusTimeoutId = null;
      }, duration);
    }
  };

  const setOutput = (message) => {
    output.textContent = message;
  };

  const setLoading = (isLoading) => {
    generateButton.disabled = isLoading;
    generateButton.textContent = isLoading ? "Generating..." : "Generate Reply";
  };

  const escapeHtml = (value) => {
    return value.replace(/[&<>"']/g, (character) => {
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

  const getHistoryLimit = () => {
    const parsedLimit = Number.parseInt(currentSettings.historyLimit, 10);
    return parsedLimit === 20 ? 20 : DEFAULT_HISTORY_LIMIT;
  };

  const formatHistoryDate = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getHistoryPreview = (reply) => {
    const cleanReply = reply.replace(/\s+/g, " ").trim();
    return cleanReply.length > 92 ? `${cleanReply.slice(0, 89)}...` : cleanReply;
  };

  const sanitizeHistoryItems = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item) => {
        return item
          && typeof item === "object"
          && typeof item.reply === "string"
          && item.reply.trim()
          && typeof item.id === "string";
      })
      .map((item) => ({
        id: item.id,
        reply: item.reply,
        provider: typeof item.provider === "string" ? item.provider : "Unknown",
        model: typeof item.model === "string" ? item.model : "Unknown model",
        mode: validModes.includes(item.mode) ? item.mode : "Generate Reply",
        tones: sanitizeTones(item.tones),
        replyLength: typeof item.replyLength === "string" ? item.replyLength : DEFAULT_SETTINGS.replyLength,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString(),
        detailLevel: item.detailLevel === "detailed" ? "detailed" : "basic",
        inputText: typeof item.inputText === "string" ? item.inputText : "",
        context: typeof item.context === "string" ? item.context : ""
      }))
      .slice(0, getHistoryLimit());
  };

  const getSelectedTones = () => {
    return [...selectedTones];
  };

  const getFallbackTone = () => {
    return validTones.includes(currentSettings.defaultTone)
      ? currentSettings.defaultTone
      : DEFAULT_SETTINGS.defaultTone;
  };

  const sanitizeTones = (tones) => {
    if (!Array.isArray(tones)) {
      return [getFallbackTone()];
    }

    const cleanTones = tones.filter((tone, index) => {
      return validTones.includes(tone) && tones.indexOf(tone) === index;
    });

    return cleanTones.length > 0 ? cleanTones : [getFallbackTone()];
  };

  const getSelectedCustomPreset = () => {
    return customPresets.find((preset) => preset.id === selectedPresetId) || null;
  };

  const syncCustomPresetSelect = () => {
    const selectedId = window.NornDraftTonePresets.resolvePresetSelection(selectedPresetId, customPresets);
    selectedPresetId = selectedId;
    customPresetSelect.replaceChildren();

    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = customPresets.length === 0 ? "No custom presets available" : "No custom preset selected";
    customPresetSelect.append(noneOption);

    customPresets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      customPresetSelect.append(option);
    });

    customPresetSelect.value = selectedPresetId;
  };

  const loadCustomPresets = async () => {
    try {
      const stored = await chrome.storage.local.get(PRESET_STORAGE_KEY);
      const result = window.NornDraftTonePresets.sanitizePresetCollection(stored[PRESET_STORAGE_KEY]);
      customPresets = result.isSupported ? result.collection.presets : [];
    } catch (error) {
      customPresets = [];
    }

    syncCustomPresetSelect();
  };

  const getDraftState = () => {
    return {
      selectedMode,
      selectedTones: getSelectedTones(),
      selectedPresetId,
      prompt: promptInput.value,
      context: contextInput.value,
      generatedReply,
      updatedAt: Date.now()
    };
  };

  const saveReplyHistory = async () => {
    await chrome.storage.local.set({
      [REPLY_HISTORY_STORAGE_KEY]: replyHistory.slice(0, getHistoryLimit())
    });
  };

  const renderHistory = () => {
    if (!currentSettings.historyEnabled) {
      historyList.innerHTML = '<p class="history__empty">Local history is off. Enable it in Settings to save generated replies.</p>';
      clearHistoryButton.hidden = replyHistory.length === 0;
      return;
    }

    if (replyHistory.length === 0) {
      historyList.innerHTML = '<p class="history__empty">No saved replies yet.</p>';
      clearHistoryButton.hidden = true;
      return;
    }

    clearHistoryButton.hidden = false;
    historyList.innerHTML = replyHistory
      .map((item) => {
        const meta = [
          `${item.provider} / ${item.model}`,
          item.mode,
          item.tones.join(", "),
          item.replyLength,
          formatHistoryDate(item.timestamp)
        ].join(" - ");

        return `
          <article class="history-item" data-history-id="${escapeHtml(item.id)}">
            <p class="history-item__preview">${escapeHtml(getHistoryPreview(item.reply))}</p>
            <p class="history-item__meta">${escapeHtml(meta)}</p>
            <div class="history-item__actions">
              <button class="button button--secondary" type="button" data-history-action="restore">Use</button>
              <button class="button button--secondary" type="button" data-history-action="copy">Copy</button>
              <button class="button button--secondary" type="button" data-history-action="delete">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const saveDraftState = async () => {
    const draftState = getDraftState();
    try {
      await chrome.storage.local.set({
        [POPUP_DRAFT_STORAGE_KEY]: draftState
      });
      lastSavedDraftAt = draftState.updatedAt;
      hasUnsavedDraftChanges = false;
    } catch (error) {
      setStatus("Draft could not be saved locally.", "error");
    }
  };

  const scheduleDraftSave = () => {
    hasUnsavedDraftChanges = true;
    if (saveDraftTimeoutId) {
      window.clearTimeout(saveDraftTimeoutId);
    }

    saveDraftTimeoutId = window.setTimeout(() => {
      saveDraftTimeoutId = null;
      saveDraftState();
    }, 350);
  };

  const syncToneChips = () => {
    toneChips.forEach((chip) => {
      const isSelected = selectedTones.includes(chip.dataset.tone);
      chip.classList.toggle("is-selected", isSelected);
      chip.setAttribute("aria-checked", String(isSelected));
    });
  };

  const setDefaultTone = (tone) => {
    selectedTones = [tone];
    selectedPresetId = "";
    syncToneChips();
    syncCustomPresetSelect();
  };

  const setMode = (mode) => {
    selectedMode = validModes.includes(mode) ? mode : "Generate Reply";
    syncModeOptions();
    updateModeCopy();
  };

  const toggleTone = (selectedChip) => {
    const tone = selectedChip.dataset.tone;
    const hasCustomPreset = Boolean(getSelectedCustomPreset());

    if (hasCustomPreset) {
      selectedPresetId = "";
      selectedTones = [tone];
      syncToneChips();
      syncCustomPresetSelect();
      setStatus(`Selected built-in tone: ${tone}.`, "success");
      saveDraftState();
      return;
    }

    const isSelected = selectedTones.includes(tone);

    if (isSelected && selectedTones.length === 1) {
      setStatus("Select at least one tone.", "validation");
      return;
    }

    selectedTones = isSelected
      ? selectedTones.filter((selectedTone) => selectedTone !== tone)
      : [...selectedTones, tone];

    syncToneChips();
    setStatus(`Selected tones: ${selectedTones.join(", ")}.`, "success");
    saveDraftState();
  };

  const selectCustomPreset = () => {
    const nextPresetId = window.NornDraftTonePresets.resolvePresetSelection(customPresetSelect.value, customPresets);

    if (!nextPresetId) {
      selectedPresetId = "";
      selectedTones = [getFallbackTone()];
      syncToneChips();
      syncCustomPresetSelect();
      setStatus("Using the default built-in tone.", "success");
      saveDraftState();
      return;
    }

    selectedPresetId = nextPresetId;
    selectedTones = [];
    syncToneChips();
    syncCustomPresetSelect();
    setStatus(`Custom preset selected: ${getSelectedCustomPreset().name}.`, "success");
    saveDraftState();
  };

  const syncModeOptions = () => {
    modeOptions.forEach((option) => {
      const isSelected = option.dataset.mode === selectedMode;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-checked", String(isSelected));
    });
  };

  const updateModeCopy = () => {
    if (selectedMode === "Rewrite Draft") {
      promptLabel.textContent = "Your draft reply";
      promptHelp.textContent = "Paste your existing reply and choose the tone to rewrite it.";
      promptInput.placeholder = "Paste the reply you already drafted.";
      return;
    }

    promptLabel.textContent = "Message to reply to";
    promptHelp.textContent = "Paste the message, question, email, or comment you received.";
    promptInput.placeholder = "Paste or type what you want to reply to.";
  };

  const selectMode = (selectedOption) => {
    setMode(selectedOption.dataset.mode);
    setStatus(`${selectedMode} mode selected.`, "success");
    saveDraftState();
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await chrome.storage.local.get(DEFAULT_SETTINGS);
      currentSettings = await migrateLegacyApiKey({ ...DEFAULT_SETTINGS, ...savedSettings });
    } catch (error) {
      currentSettings = { ...DEFAULT_SETTINGS };
    }
  };

  const getProviderApiKeySetting = (provider) => {
    return provider === "OpenAI" ? "openaiApiKey" : "geminiApiKey";
  };

  const getProviderApiKey = (settings) => {
    const keyName = getProviderApiKeySetting(settings.provider);
    return typeof settings[keyName] === "string" ? settings[keyName].trim() : "";
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

    // Migrate the old shared key only to the selected provider. This avoids
    // silently using a Gemini key for OpenAI, or an OpenAI key for Gemini.
    await chrome.storage.local.set({
      [providerKeyName]: legacyApiKey,
      apiKey: ""
    });

    return migratedSettings;
  };

  const loadReplyHistory = async () => {
    try {
      const stored = await chrome.storage.local.get(REPLY_HISTORY_STORAGE_KEY);
      replyHistory = sanitizeHistoryItems(stored[REPLY_HISTORY_STORAGE_KEY]);
    } catch (error) {
      replyHistory = [];
    }

    renderHistory();
  };

  const addReplyToHistory = async ({ reply, provider, model, mode, tones, replyLength, inputText, context }) => {
    if (!currentSettings.historyEnabled || !reply.trim()) {
      return true;
    }

    const detailLevel = currentSettings.historyDetailLevel === "detailed" ? "detailed" : "basic";
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      reply,
      provider,
      model,
      mode,
      tones,
      replyLength,
      timestamp: new Date().toISOString(),
      detailLevel
    };

    if (detailLevel === "detailed") {
      item.inputText = inputText;
      item.context = context;
    }

    replyHistory = [item, ...replyHistory].slice(0, getHistoryLimit());

    try {
      await saveReplyHistory();
      renderHistory();
      return true;
    } catch (error) {
      replyHistory = replyHistory.slice(1);
      renderHistory();
      return false;
    }
  };

  const applyDraftState = (draftState) => {
    if (!draftState || typeof draftState !== "object") {
      setMode("Generate Reply");
      setDefaultTone(getFallbackTone());
      promptInput.value = "";
      contextInput.value = "";
      generatedReply = "";
      setOutput(initialOutputText);
      return;
    }

    setMode(draftState.selectedMode);
    selectedPresetId = window.NornDraftTonePresets.resolvePresetSelection(draftState.selectedPresetId, customPresets);
    selectedTones = selectedPresetId ? [] : sanitizeTones(draftState.selectedTones);
    syncToneChips();
    syncCustomPresetSelect();
    promptInput.value = typeof draftState.prompt === "string" ? draftState.prompt : "";
    contextInput.value = typeof draftState.context === "string" ? draftState.context : "";
    generatedReply = typeof draftState.generatedReply === "string" ? draftState.generatedReply : "";
    lastSavedDraftAt = Number.isFinite(draftState.updatedAt) ? draftState.updatedAt : 0;
    setOutput(generatedReply || initialOutputText);
  };

  const loadDraftState = async () => {
    try {
      const stored = await chrome.storage.local.get(POPUP_DRAFT_STORAGE_KEY);
      applyDraftState(stored[POPUP_DRAFT_STORAGE_KEY]);
    } catch (error) {
      applyDraftState(null);
    }
  };

  const consumePendingSelection = () => {
    if (pendingSelectionPromise) {
      return pendingSelectionPromise;
    }

    pendingSelectionPromise = (async () => {
      let handoff;

      try {
        const stored = await chrome.storage.local.get(SELECTION_HANDOFF.SELECTION_HANDOFF_STORAGE_KEY);
        const storedValue = stored[SELECTION_HANDOFF.SELECTION_HANDOFF_STORAGE_KEY];
        handoff = SELECTION_HANDOFF.sanitizeSelectionHandoff(
          storedValue
        );

        if (storedValue && !handoff) {
          await chrome.storage.local.remove(SELECTION_HANDOFF.SELECTION_HANDOFF_STORAGE_KEY);
        }
      } catch (error) {
        setStatus("The selected text could not be loaded.", "error");
        return;
      }

      if (!handoff) {
        return;
      }

      const existingText = promptInput.value;
      let nextText = handoff.text;
      let action = "replace";

      if (existingText.trim()) {
        const shouldReplace = window.confirm(
          "Norn Draft already contains source text. Replace it with the webpage selection?"
        );

        if (shouldReplace) {
          action = "replace";
        } else if (window.confirm("Append the webpage selection below the existing source text?")) {
          action = "append";
          nextText = `${existingText.trimEnd()}\n\n${handoff.text}`;
        } else {
          action = "cancel";
        }
      }

      try {
        const result = await SELECTION_HANDOFF.completePendingSelection({
          action,
          text: nextText,
          insert: async (text) => {
            promptInput.value = text;
            generatedReply = "";
            setOutput(initialOutputText);
            scheduleDraftSave();
            promptInput.focus();
          },
          remove: () => chrome.storage.local.remove(SELECTION_HANDOFF.SELECTION_HANDOFF_STORAGE_KEY)
        });

        if (!result.inserted) {
          setStatus("Webpage selection was not inserted.", "validation");
          promptInput.focus();
          return;
        }
      } catch (error) {
        const cleanupMessage = action === "cancel"
          ? "Webpage selection was not inserted, but temporary cleanup failed."
          : "Webpage selection inserted, but temporary cleanup failed.";
        setStatus(cleanupMessage, "error", { persist: true });
        return;
      }

      const truncationMessage = handoff.wasTruncated
        ? ` The selection was shortened to ${SELECTION_HANDOFF.MAX_SELECTED_TEXT_LENGTH.toLocaleString()} characters.`
        : "";
      const actionMessage = action === "append" ? "appended" : "inserted";
      setStatus(`Webpage selection ${actionMessage}. Review it before generating.${truncationMessage}`, "success", { persist: true });
    })().finally(() => {
      pendingSelectionPromise = null;
    });

    return pendingSelectionPromise;
  };

  const resolveGeminiModel = (settings) => {
    const preset = settings.geminiModelPreset || DEFAULT_SETTINGS.geminiModelPreset;

    if (preset === "custom") {
      return (settings.geminiCustomModel || "").trim();
    }

    return GEMINI_MODEL_PRESETS[preset] || GEMINI_MODEL_PRESETS.auto;
  };

  const resolveOpenAiModel = (settings) => {
    const preset = settings.openaiModelPreset || DEFAULT_SETTINGS.openaiModelPreset;

    if (preset === "custom") {
      return (settings.openaiCustomModel || "").trim();
    }

    return OPENAI_MODEL_PRESETS[preset] || OPENAI_MODEL_PRESETS.recommended;
  };

  const getGeminiErrorMessage = (statusCode, responseBody, model) => {
    const geminiError = responseBody?.error || {};
    const geminiStatus = typeof geminiError.status === "string" ? geminiError.status : "";
    const geminiCode = typeof geminiError.code === "number" ? geminiError.code : null;
    const apiMessage = typeof geminiError.message === "string" ? geminiError.message : "";

    if (statusCode === 400) {
      return `Gemini request was rejected for ${model}. Check the model name and request format.`;
    }

    if (statusCode === 401 || statusCode === 403) {
      return `Gemini API key or project access issue for ${model}. Check that the Gemini API key is valid and has access to the selected model.`;
    }

    if (statusCode === 404 || /not.?found|model/i.test(apiMessage) || /not.?found|model/i.test(geminiStatus)) {
      return `Gemini model was not found for ${model}. Check the configured model name.`;
    }

    if (statusCode === 429 || /quota|rate/i.test(apiMessage) || /quota|rate/i.test(geminiStatus)) {
      return `Gemini quota/rate limit was reached, or this API project has no available quota for ${model}. The selected model may not be available for this API key or project.`;
    }

    if (statusCode >= 500) {
      return `Gemini service error for ${model}. Try again later.`;
    }

    return `Gemini returned an error for ${model}. Try again later.`;
  };

  const extractGeminiReply = (responseBody) => {
    const parts = responseBody?.candidates?.[0]?.content?.parts || [];
    return parts
      .map((part) => part.text || "")
      .join("")
      .trim();
  };

  const extractOpenAiReply = (responseBody) => {
    if (typeof responseBody?.output_text === "string" && responseBody.output_text.trim()) {
      return responseBody.output_text.trim();
    }

    const outputItems = Array.isArray(responseBody?.output) ? responseBody.output : [];

    return outputItems
      .flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .map((contentItem) => {
        if (typeof contentItem.text === "string") {
          return contentItem.text;
        }

        if (typeof contentItem.output_text === "string") {
          return contentItem.output_text;
        }

        return "";
      })
      .join("")
      .trim();
  };

  const safeParseJson = (text) => {
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  };

  const getErrorMessage = (error, fallbackMessage) => {
    if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    return fallbackMessage;
  };

  const createFailureResult = (message) => {
    return {
      ok: false,
      errorMessage: message
    };
  };

  const getOpenAiErrorMessage = (statusCode, responseBody, model) => {
    const openAiError = responseBody?.error || {};
    const apiMessage = typeof openAiError.message === "string" ? openAiError.message : "";
    const errorCode = typeof openAiError.code === "string" ? openAiError.code : "";
    const errorType = typeof openAiError.type === "string" ? openAiError.type : "";

    if (statusCode === 400) {
      return `OpenAI request was rejected for ${model}. Check the model name and request format.`;
    }

    if (statusCode === 401) {
      return "OpenAI API key issue. Check that your OpenAI API key is valid.";
    }

    if (statusCode === 403) {
      return `OpenAI project access issue for ${model}. Check that your API key has access to the selected model.`;
    }

    if (statusCode === 404 || /not.?found|model/i.test(apiMessage) || /not.?found|model/i.test(errorCode) || /not.?found|model/i.test(errorType)) {
      return `OpenAI model was not found for ${model}. Check the configured model name.`;
    }

    if (statusCode === 429 || /quota|rate|limit/i.test(apiMessage) || /quota|rate|limit/i.test(errorCode) || /quota|rate|limit/i.test(errorType)) {
      return `OpenAI quota/rate limit was reached, or this API project has no available quota for ${model}.`;
    }

    if (statusCode >= 500) {
      return `OpenAI service error for ${model}. Try again later.`;
    }

    return `OpenAI returned an error for ${model}. Try again later.`;
  };

  const callGemini = async ({ apiKey, model, prompt }) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    const responseText = await response.text().catch(() => "");
    const responseBody = safeParseJson(responseText) || {};

    if (!response.ok) {
      return createFailureResult(getGeminiErrorMessage(response.status, responseBody, model));
    }

    const reply = extractGeminiReply(responseBody);

    if (!reply) {
      return createFailureResult("Gemini returned an empty reply. Please try again.");
    }

    return {
      ok: true,
      reply
    };
  };

  const callOpenAi = async ({ apiKey, model, prompt }) => {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const responseText = await response.text().catch(() => "");
    const responseBody = safeParseJson(responseText) || {};

    if (!response.ok) {
      return createFailureResult(getOpenAiErrorMessage(response.status, responseBody, model));
    }

    const reply = extractOpenAiReply(responseBody);

    if (!reply) {
      return createFailureResult("OpenAI returned an empty reply. Please try again.");
    }

    return {
      ok: true,
      reply
    };
  };

  const generateReply = async () => {
    const prompt = promptInput.value.trim();
    const context = contextInput.value.trim();

    if (!prompt) {
      generatedReply = "";
      setOutput("Type or paste a message first, then generate a recommended reply.");
      setStatus("Add a little context first, then we can draft from there.", "validation");
      saveDraftState();
      promptInput.focus();
      return;
    }

    await loadSettings();

    if (currentSettings.provider !== "Gemini" && currentSettings.provider !== "OpenAI") {
      generatedReply = "";
      setOutput("This AI provider is not supported yet. Choose Gemini or OpenAI in Settings.");
      setStatus("Unsupported AI provider.", "error");
      saveDraftState();
      return;
    }

    const isOpenAiProvider = currentSettings.provider === "OpenAI";
    const selectedModel = isOpenAiProvider
      ? resolveOpenAiModel(currentSettings)
      : resolveGeminiModel(currentSettings);
    const customModelMessage = isOpenAiProvider
      ? "Please enter a custom OpenAI model name or choose a preset model."
      : "Please enter a custom Gemini model name or choose a preset model.";

    if (!selectedModel) {
      generatedReply = "";
      setOutput(customModelMessage);
      setStatus(customModelMessage, "validation");
      saveDraftState();
      return;
    }

    const providerApiKey = getProviderApiKey(currentSettings);

    if (!providerApiKey) {
      generatedReply = "";
      const missingKeyMessage = isOpenAiProvider
        ? "Please add your OpenAI API key in Settings first."
        : "Please add your Gemini API key in Settings first.";
      setOutput(missingKeyMessage);
      setStatus(missingKeyMessage, "error");
      saveDraftState();
      return;
    }

    const selectedCustomPreset = getSelectedCustomPreset();
    const aiPrompt = window.NornDraftTonePresets.buildPrompt({
      mode: selectedMode,
      tones: getSelectedTones(),
      customInstruction: selectedCustomPreset?.instruction || "",
      prompt,
      context,
      replyLength: currentSettings.replyLength
    });

    generatedReply = "";
    setLoading(true);
    setOutput("Generating your recommended reply...");
    setStatus(`Generating with ${currentSettings.provider}...`, "success", { persist: true });
    saveDraftState();

    try {
      const generationResult = isOpenAiProvider
        ? await callOpenAi({
            apiKey: providerApiKey,
            model: selectedModel,
            prompt: aiPrompt
          })
        : await callGemini({
            apiKey: providerApiKey,
            model: selectedModel,
            prompt: aiPrompt
          });
      if (!generationResult.ok) {
        generatedReply = "";
        setOutput(generationResult.errorMessage);
        setStatus(generationResult.errorMessage, "error");
        await saveDraftState();
        return;
      }

      generatedReply = generationResult.reply;
      setOutput(generatedReply);
      const historySaved = await addReplyToHistory({
        reply: generatedReply,
        provider: currentSettings.provider,
        model: selectedModel,
        mode: selectedMode,
        tones: getSelectedTones(),
        replyLength: currentSettings.replyLength,
        inputText: prompt,
        context
      });
      setStatus(
        historySaved ? "Reply generated." : "Reply generated, but history could not be saved.",
        historySaved ? "success" : "error"
      );
      await saveDraftState();
    } catch (error) {
      generatedReply = "";
      const safeMessage = getErrorMessage(error, "The reply could not be generated. Please try again.");

      if (error instanceof TypeError) {
        setOutput("Network connection failed. Check your connection and try again.");
        setStatus("Network connection failed.", "error");
        await saveDraftState();
        return;
      }

      setOutput(safeMessage);
      setStatus(safeMessage, "error");
      await saveDraftState();
    } finally {
      setLoading(false);
    }
  };

  generateButton.addEventListener("click", generateReply);
  clearButton.addEventListener("click", async () => {
    if (saveDraftTimeoutId) {
      window.clearTimeout(saveDraftTimeoutId);
      saveDraftTimeoutId = null;
    }

    promptInput.value = "";
    contextInput.value = "";
    generatedReply = "";
    setOutput(initialOutputText);
    setMode("Generate Reply");
    setDefaultTone(getFallbackTone());

    try {
      await chrome.storage.local.remove(POPUP_DRAFT_STORAGE_KEY);
      setStatus("Draft cleared.", "success");
    } catch (error) {
      setStatus("Draft cleared, but saved draft state could not be removed.", "error");
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!generatedReply) {
      setStatus("Generate a reply first, then copy will be ready.", "validation");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedReply);
      setStatus("Reply copied to clipboard.", "success");
    } catch (error) {
      setStatus("Clipboard copy was not available. Select the reply text and copy it manually.", "error");
    }
  });

  clearHistoryButton.addEventListener("click", async () => {
    replyHistory = [];

    try {
      await chrome.storage.local.set({ [REPLY_HISTORY_STORAGE_KEY]: [] });
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

    if (action === "restore") {
      generatedReply = item.reply;
      setOutput(generatedReply);
      await saveDraftState();
      setStatus("History reply restored.", "success");
      return;
    }

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(item.reply);
        setStatus("History reply copied to clipboard.", "success");
      } catch (error) {
        setStatus("Clipboard copy was not available. Select the reply text and copy it manually.", "error");
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

  settingsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  const openInSidePanel = async () => {
    try {
      await saveDraftState();
      const currentWindow = await chrome.windows.getCurrent();
      if (!chrome.sidePanel?.open || !Number.isInteger(currentWindow.id)) {
        throw new Error("Chrome Side Panel is unavailable.");
      }
      console.debug(`Norn Draft side-panel attempt source=popup windowId=${currentWindow.id}`);
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      console.debug(`Norn Draft side-panel opened source=popup windowId=${currentWindow.id}`);
    } catch (error) {
      const sidePanelMessage = window.NornDraftSidePanel.normalizeExtensionError(error);
      try {
        const currentWindow = await chrome.windows.getCurrent();
        const response = await chrome.runtime.sendMessage({
          type: "nornDraftOpenSidePanel",
          windowId: currentWindow.id,
          source: "popup-fallback",
          sidePanelAlreadyAttempted: true,
          sidePanelErrorMessage: sidePanelMessage
        });
        if (!response?.ok) {
          throw new Error(response?.error || "Workspace did not open.");
        }
        setStatus(response.opened === "window" ? "Opened the Norn Draft window fallback." : "Opened Norn Draft in the side panel.", "success");
      } catch (fallbackError) {
        console.error(`Norn Draft popup workspace fallback failed; side-panel: ${sidePanelMessage}; fallback: ${window.NornDraftSidePanel.normalizeExtensionError(fallbackError)}`);
        setStatus("Norn Draft could not open the side panel.", "error");
      }
    }
  };

  if (!document.body.classList.contains("sidepanel")) {
    openSidePanelButton.addEventListener("click", openInSidePanel);
  }

  toneChips.forEach((chip) => {
    chip.addEventListener("click", () => toggleTone(chip));
  });

  customPresetSelect.addEventListener("change", selectCustomPreset);

  modeOptions.forEach((option) => {
    option.addEventListener("click", () => selectMode(option));
  });

  promptInput.addEventListener("input", scheduleDraftSave);
  contextInput.addEventListener("input", scheduleDraftSave);

  window.addEventListener("pagehide", () => {
    if (hasUnsavedDraftChanges) {
      saveDraftState();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[SELECTION_HANDOFF.SELECTION_HANDOFF_STORAGE_KEY]) {
      consumePendingSelection();
    }

    if (changes[POPUP_DRAFT_STORAGE_KEY] && !hasUnsavedDraftChanges) {
      const incomingDraft = changes[POPUP_DRAFT_STORAGE_KEY].newValue;
      const incomingUpdatedAt = Number.isFinite(incomingDraft?.updatedAt) ? incomingDraft.updatedAt : 0;

      if (incomingUpdatedAt > lastSavedDraftAt) {
        applyDraftState(incomingDraft);
      }
    }

    if (!changes[PRESET_STORAGE_KEY]) {
      return;
    }

    const previousPresetId = selectedPresetId;
    loadCustomPresets().then(() => {
      if (previousPresetId && !selectedPresetId) {
        selectedTones = [getFallbackTone()];
        syncToneChips();
        saveDraftState();
        setStatus("The selected custom preset was removed, so the default built-in tone is active.", "validation");
      }
    });
  });

  loadSettings()
    .then(loadCustomPresets)
    .then(loadDraftState)
    .then(consumePendingSelection)
    .then(loadReplyHistory)
    .then(() => {
      setStatus("");
    });
});
