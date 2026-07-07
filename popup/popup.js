document.addEventListener("DOMContentLoaded", () => {
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

  const setStatus = (message, type) => {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (type) {
      status.classList.add(`is-${type}`);
    }
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

  const loadDefaultTone = async () => {
    try {
      const { defaultTone } = await chrome.storage.local.get({ defaultTone: "Professional" });
      const savedToneChip = toneChips.find((chip) => chip.dataset.tone === defaultTone);

      if (savedToneChip) {
        setDefaultTone(savedToneChip.dataset.tone);
        setStatus("");
      }
    } catch (error) {
      setStatus("");
    }
  };

  generateButton.addEventListener("click", () => {
    const prompt = promptInput.value.trim();
    const context = contextInput.value.trim();

    if (!prompt) {
      generatedReply = "";
      output.textContent = "Type or paste a message first, then generate a recommended reply.";
      setStatus("Add a little context first, then we can draft from there.", "error");
      promptInput.focus();
      return;
    }

    generatedReply = `AI integration is not connected yet.\n\nMode: ${selectedMode}.\nSelected tones: ${selectedTones.join(", ")}.\nContext provided: ${context ? "Yes" : "No"}.`;
    output.textContent = generatedReply;
    setStatus("Placeholder reply generated locally.", "success");
  });

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
  loadDefaultTone();
});
