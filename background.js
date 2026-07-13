"use strict";

importScripts("shared/selection-handoff.js");

const MENU_ID = "norn-draft-open-selection";
const WINDOW_ID_STORAGE_KEY = "nornDraftSelectionWindowId";
const HANDOFF = NornDraftSelectionHandoff;
const sessionStorage = chrome.storage.session;

const logContextMenuError = (error) => {
  console.warn("Norn Draft context-menu setup failed.", error?.message || "Unknown browser error");
};

const registerContextMenu = () => {
  chrome.contextMenus.removeAll()
    .then(() => chrome.contextMenus.create({
      id: MENU_ID,
      title: "Open selection in Norn Draft",
      contexts: ["selection"]
    }))
    .catch(logContextMenuError);
};

const getExistingWindowId = async () => {
  if (!sessionStorage) {
    return null;
  }

  try {
    const stored = await sessionStorage.get(WINDOW_ID_STORAGE_KEY);
    const windowId = stored[WINDOW_ID_STORAGE_KEY];

    if (typeof windowId !== "number") {
      return null;
    }

    await chrome.windows.get(windowId);
    return windowId;
  } catch (error) {
    await sessionStorage.remove(WINDOW_ID_STORAGE_KEY).catch(() => {});
    return null;
  }
};

const openNornDraftWindow = async () => {
  const existingWindowId = await getExistingWindowId();

  if (existingWindowId !== null) {
    try {
      await chrome.windows.update(existingWindowId, { focused: true });
      return;
    } catch (error) {
      if (sessionStorage) {
        await sessionStorage.remove(WINDOW_ID_STORAGE_KEY).catch(() => {});
      }
    }
  }

  try {
    const createdWindow = await chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 420,
      height: 760,
      focused: true
    });

    if (typeof createdWindow?.id === "number") {
      if (sessionStorage) {
        await sessionStorage.set({ [WINDOW_ID_STORAGE_KEY]: createdWindow.id });
      }
    }
  } catch (error) {
    console.warn("Norn Draft could not open its extension window.");
  }
};

chrome.runtime.onInstalled.addListener(registerContextMenu);
chrome.runtime.onStartup.addListener(registerContextMenu);
chrome.windows.onRemoved.addListener((windowId) => {
  if (!sessionStorage) {
    return;
  }

  sessionStorage.get(WINDOW_ID_STORAGE_KEY).then((stored) => {
    if (stored[WINDOW_ID_STORAGE_KEY] === windowId) {
      return sessionStorage.remove(WINDOW_ID_STORAGE_KEY);
    }
    return undefined;
  }).catch(() => {});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !Array.isArray(info.contexts) || !info.contexts.includes("selection")) {
    return;
  }

  const handoff = HANDOFF.createSelectionHandoff({ selectionText: info.selectionText });

  if (!handoff) {
    return;
  }

  try {
    await chrome.storage.local.set({ [HANDOFF.SELECTION_HANDOFF_STORAGE_KEY]: handoff });
    await openNornDraftWindow();
  } catch (error) {
    console.warn("Norn Draft could not prepare the selected text.");
  }
});
