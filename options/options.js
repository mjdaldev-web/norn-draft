document.addEventListener("DOMContentLoaded", () => {
  const defaults = {
    provider: "Gemini",
    apiKey: "",
    defaultTone: "Professional",
    replyLength: "Balanced"
  };

  const form = document.querySelector("#settings-form");
  const apiKeyInput = document.querySelector("#api-key");
  const toggleApiKeyButton = document.querySelector("#toggle-api-key");
  const clearApiKeyButton = document.querySelector("#clear-api-key");
  const resetSettingsButton = document.querySelector("#reset-settings");
  const defaultToneSelect = document.querySelector("#default-tone");
  const replyLengthSelect = document.querySelector("#reply-length");
  const status = document.querySelector("#status");

  const storage = chrome.storage.local;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (type) {
      status.classList.add(`is-${type}`);
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

  const readFormSettings = () => {
    return {
      provider: getSelectedProvider(),
      apiKey: apiKeyInput.value.trim(),
      defaultTone: defaultToneSelect.value,
      replyLength: replyLengthSelect.value
    };
  };

  const applySettings = (settings) => {
    setSelectedProvider(settings.provider);
    apiKeyInput.value = settings.apiKey;
    defaultToneSelect.value = settings.defaultTone;
    replyLengthSelect.value = settings.replyLength;
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await storage.get(defaults);
      applySettings({ ...defaults, ...savedSettings });
      setStatus("Settings loaded.", "success");
    } catch (error) {
      applySettings(defaults);
      setStatus("Settings could not load, so defaults are shown.", "error");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await storage.set(readFormSettings());
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
    apiKeyInput.value = "";

    try {
      await storage.set({ apiKey: "" });
      setStatus("API key cleared from local storage.", "success");
    } catch (error) {
      setStatus("API key could not be cleared. Please try again.", "error");
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

  loadSettings();
});
