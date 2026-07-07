document.addEventListener("DOMContentLoaded", () => {
  const GEMINI_MODEL = "gemini-3.5-flash";
  // Fallback option for future work: gemini-3.1-flash-lite
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const DEFAULT_SETTINGS = {
    provider: "Gemini",
    apiKey: "",
    defaultTone: "Professional",
    replyLength: "Balanced"
  };

  const toneChips = Array.from(document.querySelectorAll(".tone-chip"));
  const modeOptions = Array.from(document.querySelectorAll(".mode-option"));
  const promptLabel = document.querySelector("#prompt-title");
  const promptHelp = document.querySelector("#prompt-help");
  const promptInput = document.querySelector("#prompt");
  const contextInput = document.querySelector("#context");
  const generateButton = document.querySelector("#generate");
  const copyButton = document.querySelector("#copy");
  const settingsButton = document.querySelector("#settings");
  const output = document.querySelector("#reply-output");
  const status = document.querySelector("#status");

  let selectedTones = ["Professional"];
  let selectedMode = "Generate Reply";
  let generatedReply = "";
  let currentSettings = { ...DEFAULT_SETTINGS };

  const setStatus = (message, type) => {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (type) {
      status.classList.add(`is-${type}`);
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

  const toggleTone = (selectedChip) => {
    const tone = selectedChip.dataset.tone;
    const isSelected = selectedTones.includes(tone);

    if (isSelected && selectedTones.length === 1) {
      setStatus("Select at least one tone.", "error");
      return;
    }

    selectedTones = isSelected
      ? selectedTones.filter((selectedTone) => selectedTone !== tone)
      : [...selectedTones, tone];

    syncToneChips();
    setStatus(`Selected tones: ${selectedTones.join(", ")}.`, "success");
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
    selectedMode = selectedOption.dataset.mode;
    syncModeOptions();
    updateModeCopy();
    setStatus(`${selectedMode} mode selected.`, "success");
  };

  const loadSettings = async ({ applyDefaultTone = false } = {}) => {
    try {
      const savedSettings = await chrome.storage.local.get(DEFAULT_SETTINGS);
      currentSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
      const savedToneChip = toneChips.find((chip) => chip.dataset.tone === currentSettings.defaultTone);

      if (applyDefaultTone && savedToneChip) {
        setDefaultTone(savedToneChip.dataset.tone);
      }

      setStatus("");
    } catch (error) {
      currentSettings = { ...DEFAULT_SETTINGS };

      if (applyDefaultTone) {
        setDefaultTone(DEFAULT_SETTINGS.defaultTone);
      }

      setStatus("");
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

  const getGeminiErrorMessage = (statusCode, responseBody) => {
    const geminiError = responseBody?.error || {};
    const geminiStatus = typeof geminiError.status === "string" ? geminiError.status : "";
    const geminiCode = typeof geminiError.code === "number" ? geminiError.code : null;
    const apiMessage = typeof geminiError.message === "string" ? geminiError.message : "";

    if (statusCode === 400) {
      return `Gemini request was rejected for ${GEMINI_MODEL}. Check the model name and request format.`;
    }

    if (statusCode === 401 || statusCode === 403) {
      return `Gemini API key or project access issue for ${GEMINI_MODEL}. Check that the Gemini API key is valid and has access.`;
    }

    if (statusCode === 404 || /not.?found|model/i.test(apiMessage) || /not.?found|model/i.test(geminiStatus)) {
      return `Gemini model was not found for ${GEMINI_MODEL}. Check the configured model name.`;
    }

    if (statusCode === 429 || /quota|rate/i.test(apiMessage) || /quota|rate/i.test(geminiStatus)) {
      return `Gemini quota/rate limit was reached, or this API project has no available quota for ${GEMINI_MODEL}.`;
    }

    if (statusCode >= 500) {
      return `Gemini service error for ${GEMINI_MODEL}. Try again later.`;
    }

    return `Gemini returned an error for ${GEMINI_MODEL}. Try again later.`;
  };

  const extractGeminiReply = (responseBody) => {
    const parts = responseBody?.candidates?.[0]?.content?.parts || [];
    return parts
      .map((part) => part.text || "")
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

  const callGemini = async ({ apiKey, prompt }) => {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
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
      const geminiError = responseBody.error || {};
      console.warn("Gemini generation failed", {
        model: GEMINI_MODEL,
        httpStatus: response.status,
        geminiStatus: typeof geminiError.status === "string" ? geminiError.status : "",
        geminiCode: typeof geminiError.code === "number" ? geminiError.code : null,
        message: typeof geminiError.message === "string" ? geminiError.message : response.statusText || "Unknown error"
      });

      throw new Error(getGeminiErrorMessage(response.status, responseBody));
    }

    const reply = extractGeminiReply(responseBody);

    if (!reply) {
      throw new Error("Gemini returned an empty reply. Please try again.");
    }

    return reply;
  };

  const generateReply = async () => {
    const prompt = promptInput.value.trim();
    const context = contextInput.value.trim();

    if (!prompt) {
      generatedReply = "";
      output.textContent = "Type or paste a message first, then generate a recommended reply.";
      setStatus("Add a little context first, then we can draft from there.", "error");
      promptInput.focus();
      return;
    }

    await loadSettings();

    if (currentSettings.provider === "OpenAI") {
      generatedReply = "";
      setOutput("OpenAI support is not connected yet. Choose Gemini in Settings to generate a reply now.");
      setStatus("OpenAI support is not connected yet.", "error");
      return;
    }

    if (currentSettings.provider !== "Gemini") {
      generatedReply = "";
      setOutput("This AI provider is not supported yet. Choose Gemini in Settings.");
      setStatus("Unsupported AI provider.", "error");
      return;
    }

    if (!currentSettings.apiKey) {
      generatedReply = "";
      setOutput("Please add your API key in Settings first.");
      setStatus("Please add your API key in Settings first.", "error");
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
    setStatus("Generating with Gemini...", "success");

    try {
      generatedReply = await callGemini({
        apiKey: currentSettings.apiKey,
        prompt: aiPrompt
      });
      setOutput(generatedReply);
      setStatus("Reply generated.", "success");
    } catch (error) {
      generatedReply = "";

      if (error instanceof TypeError) {
        setOutput("Network connection failed. Check your connection and try again.");
        setStatus("Network connection failed.", "error");
        return;
      }

      setOutput(error.message || "The reply could not be generated. Please try again.");
      setStatus(error.message || "The reply could not be generated.", "error");
    } finally {
      setLoading(false);
    }
  };

  generateButton.addEventListener("click", generateReply);

  copyButton.addEventListener("click", async () => {
    if (!generatedReply) {
      setStatus("Generate a reply first, then copy will be ready.", "error");
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

  syncToneChips();
  syncModeOptions();
  updateModeCopy();
  loadSettings({ applyDefaultTone: true });
});
