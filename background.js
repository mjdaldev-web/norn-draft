"use strict";

importScripts(
  "shared/selection-handoff.js",
  "shared/context-menu-handler.js",
  "shared/side-panel.js"
);

const MENU_ID = "norn-draft-open-selection";
const WINDOW_ID_STORAGE_KEY = "nornDraftSelectionWindowId";
const CONTEXT_MENU = NornDraftContextMenu;
const SIDE_PANEL = NornDraftSidePanel;
const sessionStorage = chrome.storage.session;

const getErrorMessage = (error) => SIDE_PANEL.normalizeExtensionError(error);

const registerContextMenu = () => {
  Promise.resolve()
    .then(() => chrome.contextMenus.removeAll())
    .then(() => chrome.contextMenus.create({
      id: MENU_ID,
      title: "Open selection in Norn Draft",
      contexts: ["selection"]
    }))
    .catch((error) => {
      console.error(`Norn Draft context-menu registration failed: ${getErrorMessage(error)}`);
    });
};

const configureToolbarBehavior = async () => {
  try {
    const enabled = await SIDE_PANEL.migrateSidePanelPreference({
      storage: chrome.storage.local,
      logger: console
    });
    const popupPath = chrome.runtime.getManifest().action?.default_popup || SIDE_PANEL.QUICK_POPUP_PATH;
    await SIDE_PANEL.applyToolbarPreference({
      enabled,
      action: chrome.action,
      sidePanel: chrome.sidePanel,
      popupPath,
      logger: console
    });
  } catch (error) {
    console.error(`Norn Draft toolbar behavior could not be configured: ${getErrorMessage(error)}`);
  }
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

  if (typeof createdWindow?.id === "number" && sessionStorage) {
    await sessionStorage.set({ [WINDOW_ID_STORAGE_KEY]: createdWindow.id });
  }
};

const openNornDraftSidePanel = async (windowId) => {
  await SIDE_PANEL.openSidePanel({ sidePanel: chrome.sidePanel, windowId });
};

const openNornDraftWorkspace = async (info = {}) => {
  const windowId = info?.tab?.windowId ?? info?.windowId;
  const source = typeof info?.source === "string" ? info.source : "extension-ui";

  if (info?.sidePanelAlreadyAttempted === true) {
    const sidePanelMessage = typeof info.sidePanelErrorMessage === "string" && info.sidePanelErrorMessage
      ? info.sidePanelErrorMessage
      : "Unknown browser error";

    try {
      await openNornDraftWindow();
    } catch (fallbackError) {
      console.error(`Norn Draft workspace opening failed source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}; side-panel: ${sidePanelMessage}; fallback: ${getErrorMessage(fallbackError)}`);
      throw fallbackError;
    }

    console.warn(`Norn Draft side panel could not open; using fallback source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}: ${sidePanelMessage}`);
    return { opened: "window" };
  }

  try {
    console.debug(`Norn Draft side-panel attempt source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}`);
    await openNornDraftSidePanel(windowId);
    console.debug(`Norn Draft side-panel opened source=${source} windowId=${windowId}`);
    return { opened: "sidePanel" };
  } catch (sidePanelError) {
    const sidePanelMessage = getErrorMessage(sidePanelError);

    try {
      await openNornDraftWindow();
    } catch (fallbackError) {
      console.error(`Norn Draft workspace opening failed source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}; side-panel: ${sidePanelMessage}; fallback: ${getErrorMessage(fallbackError)}`);
      throw fallbackError;
    }

    console.warn(`Norn Draft side panel could not open; using fallback source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}: ${sidePanelMessage}`);
    return { opened: "window" };
  }
};

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenu();
  configureToolbarBehavior();
});
chrome.runtime.onStartup.addListener(() => {
  registerContextMenu();
  configureToolbarBehavior();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[SIDE_PANEL.SIDE_PANEL_PREFERENCE_KEY]) {
    configureToolbarBehavior();
  }
});
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const handoff = CONTEXT_MENU.createSelectionHandoffFromMenuInfo(info);

  if (!handoff) {
    return;
  }

  const windowId = tab?.windowId;
  let panelOpenPromise;

  try {
    panelOpenPromise = chrome.sidePanel?.open && typeof windowId === "number"
      ? chrome.sidePanel.open({ windowId })
      : Promise.reject(new Error("Chrome Side Panel is unavailable for this window."));
  } catch (error) {
    panelOpenPromise = Promise.reject(error);
  }

  void CONTEXT_MENU.finishSelectionContextMenuAction({
    handoff,
    storage: chrome.storage.local,
    panelOpenPromise,
    openFallbackWindow: openNornDraftWindow,
    source: "context-menu",
    windowId,
    logger: console
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "nornDraftOpenSidePanel") {
    return undefined;
  }

  const windowId = typeof message.windowId === "number" ? message.windowId : sender?.tab?.windowId;
  openNornDraftWorkspace({
    windowId,
    source: message.source || "popup-fallback",
    sidePanelAlreadyAttempted: message.sidePanelAlreadyAttempted === true,
    sidePanelErrorMessage: message.sidePanelErrorMessage
  })
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error(`Norn Draft workspace opening failed: ${getErrorMessage(error)}`);
      sendResponse({ ok: false, error: "Norn Draft could not open its workspace." });
    });
  return true;
});

// Apply the saved toolbar mode every time this MV3 service worker starts.
void configureToolbarBehavior();
