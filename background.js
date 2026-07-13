"use strict";

importScripts("shared/selection-handoff.js");
importScripts("shared/context-menu-handler.js");

const MENU_ID = "norn-draft-open-selection";
const WINDOW_ID_STORAGE_KEY = "nornDraftSelectionWindowId";
const CONTEXT_MENU = NornDraftContextMenu;
const sessionStorage = chrome.storage.session;

const registerContextMenu = () => {
  Promise.resolve()
    .then(() => chrome.contextMenus.removeAll())
    .then(() => chrome.contextMenus.create({
      id: MENU_ID,
      title: "Open selection in Norn Draft",
      contexts: ["selection"]
    }))
    .catch((error) => {
      console.error("Norn Draft context-menu registration failed.", {
        operation: "register context menu",
        menuId: MENU_ID,
        error: error?.message || "Unknown browser error"
      });
    });
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

chrome.contextMenus.onClicked.addListener((info) => {
  CONTEXT_MENU.handleSelectionContextMenuClick({
    info,
    storage: chrome.storage.local,
    openWindow: openNornDraftWindow,
    logger: console
  });
});
