document.addEventListener("DOMContentLoaded", () => {
  const toneChips = Array.from(document.querySelectorAll(".tone-chip"));
  const promptInput = document.querySelector("#prompt");
  const generateButton = document.querySelector("#generate");
  const copyButton = document.querySelector("#copy");
  const settingsButton = document.querySelector("#settings");
  const output = document.querySelector("#reply-output");
  const status = document.querySelector("#status");

  let selectedTones = ["Professional"];
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

    if (!prompt) {
      generatedReply = "";
      output.textContent = "Type or paste a message first, then generate a recommended reply.";
      setStatus("Add a little context first, then we can draft from there.", "error");
      promptInput.focus();
      return;
    }

    generatedReply = `AI integration is not connected yet.\n\nSelected tones: ${selectedTones.join(", ")}.\n\nWhen API support is added, Norn Draft will use the text you typed here to draft a polished reply with these tone choices.`;
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

  syncToneChips();
  loadDefaultTone();
});
