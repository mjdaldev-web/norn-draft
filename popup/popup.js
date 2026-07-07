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
  const DEFAULT_SETTINGS = {
    provider: "Gemini",
    apiKey: "",
    defaultTone: "Professional",
    replyLength: "Balanced",
    geminiModelPreset: "auto",
    geminiCustomModel: "",
    openaiModelPreset: "recommended",
    openaiCustomModel: ""
  };

  const toneChips = Array.from(document.querySelectorAll(".tone-chip"));
  const modeOptions = Array.from(document.querySelectorAll(".mode-option"));
  const promptLabel = document.querySelector("#prompt-title");
  const promptHelp = document.querySelector("#prompt-help");
  const promptInput = document.querySelector("#prompt");
  const contextInput = document.querySelector("#context");
  const generateButton = document.querySelector("#generate");
  const clearButton = document.querySelector("#clear");
  const copyButton = document.querySelector("#copy");
  const settingsButton = document.querySelector("#settings");
  const output = document.querySelector("#reply-output");
  const status = document.querySelector("#status");
  const initialOutputText = output.textContent.trim();
  const validModes = ["Generate Reply", "Rewrite Draft"];
  const validTones = toneChips.map((chip) => chip.dataset.tone);

  let selectedTones = ["Professional"];
  let selectedMode = "Generate Reply";
  let generatedReply = "";
  let currentSettings = { ...DEFAULT_SETTINGS };
  let statusTimeoutId = null;
  let saveDraftTimeoutId = null;

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

  const getDraftState = () => {
    return {
      selectedMode,
      selectedTones: getSelectedTones(),
      prompt: promptInput.value,
      context: contextInput.value,
      generatedReply
    };
  };

  const saveDraftState = async () => {
    try {
      await chrome.storage.local.set({
        [POPUP_DRAFT_STORAGE_KEY]: getDraftState()
      });
    } catch (error) {
      setStatus("Draft could not be saved locally.", "error");
    }
  };

  const scheduleDraftSave = () => {
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
    syncToneChips();
  };

  const setMode = (mode) => {
    selectedMode = validModes.includes(mode) ? mode : "Generate Reply";
    syncModeOptions();
    updateModeCopy();
  };

  const toggleTone = (selectedChip) => {
    const tone = selectedChip.dataset.tone;
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
      currentSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
    } catch (error) {
      currentSettings = { ...DEFAULT_SETTINGS };
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
    selectedTones = sanitizeTones(draftState.selectedTones);
    syncToneChips();
    promptInput.value = typeof draftState.prompt === "string" ? draftState.prompt : "";
    contextInput.value = typeof draftState.context === "string" ? draftState.context : "";
    generatedReply = typeof draftState.generatedReply === "string" ? draftState.generatedReply : "";
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

  const getLengthGuidance = (replyLength) => {
    if (replyLength === "Concise") {
      return "Keep the reply short and direct.";
    }

    if (replyLength === "Detailed") {
      return "Make the reply more complete, but not overly long.";
    }

    return "Make the reply clear and moderately detailed.";
  };

  const buildPrompt = ({ mode, tones, prompt, context, replyLength }) => {
    const modeInstruction = mode === "Rewrite Draft"
      ? "Rewrite the user's draft reply. Preserve the original meaning and important details."
      : "Write a reply to the received message.";
    const contextInstruction = context
      ? `Optional context to improve accuracy:\n${context}`
      : "No optional context was provided.";

    return [
      "You are Norn Draft, a careful assistant that writes polished, copy-ready replies.",
      modeInstruction,
      `Use these tones: ${tones.join(", ")}.`,
      getLengthGuidance(replyLength),
      "Use optional context only to improve accuracy.",
      "Do not invent facts not provided by the user.",
      "Return only the reply text, without labels, markdown fences, or explanations.",
      "",
      `Mode: ${mode}`,
      contextInstruction,
      "",
      mode === "Rewrite Draft" ? "User's draft reply:" : "Message to reply to:",
      prompt
    ].join("\n");
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

    if (!currentSettings.apiKey) {
      generatedReply = "";
      const missingKeyMessage = isOpenAiProvider
        ? "Please add your OpenAI API key in Settings first."
        : "Please add your Gemini API key in Settings first.";
      setOutput(missingKeyMessage);
      setStatus(missingKeyMessage, "error");
      saveDraftState();
      return;
    }

    const aiPrompt = buildPrompt({
      mode: selectedMode,
      tones: getSelectedTones(),
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
            apiKey: currentSettings.apiKey,
            model: selectedModel,
            prompt: aiPrompt
          })
        : await callGemini({
            apiKey: currentSettings.apiKey,
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
      setStatus("Reply generated.", "success");
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

  settingsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  toneChips.forEach((chip) => {
    chip.addEventListener("click", () => toggleTone(chip));
  });

  modeOptions.forEach((option) => {
    option.addEventListener("click", () => selectMode(option));
  });

  promptInput.addEventListener("input", scheduleDraftSave);
  contextInput.addEventListener("input", scheduleDraftSave);

  loadSettings()
    .then(loadDraftState)
    .then(() => {
      setStatus("");
    });
});
