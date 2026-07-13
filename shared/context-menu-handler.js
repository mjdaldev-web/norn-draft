(function (root) {
  "use strict";

  const MENU_ID = "norn-draft-open-selection";

  const getErrorMessage = (error) => {
    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof globalThis.chrome?.runtime?.lastError?.message === "string" && globalThis.chrome.runtime.lastError.message.trim()) {
      return globalThis.chrome.runtime.lastError.message.trim();
    }

    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    if (error && typeof error === "object") {
      const details = {};
      ["name", "code", "status", "reason"].forEach((key) => {
        if (typeof error[key] === "string" || typeof error[key] === "number") {
          details[key] = error[key];
        }
      });
      const serialized = JSON.stringify(details);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    }

    return "Unknown browser error";
  };

  const log = (logger, level, message) => {
    const method = typeof logger[level] === "function" ? logger[level] : logger.error;
    method.call(logger, message);
  };

  const createSelectionHandoffFromMenuInfo = (info) => {
    if (!info || info.menuItemId !== MENU_ID) {
      return null;
    }

    return root.NornDraftSelectionHandoff.createSelectionHandoff({
      selectionText: info.selectionText
    });
  };

  const storeSelectionHandoff = async ({ handoff, storage, logger = console }) => {
    try {
      await storage.set({
        [root.NornDraftSelectionHandoff.SELECTION_HANDOFF_STORAGE_KEY]: handoff
      });
      return true;
    } catch (error) {
      log(logger, "error", `Norn Draft pending-selection storage failed menuId=${MENU_ID} selectedTextLength=${handoff.text.length}: ${getErrorMessage(error)}`);
      return false;
    }
  };

  const finishSelectionContextMenuAction = async ({ handoff, storage, panelOpenPromise, openFallbackWindow, source = "context-menu", windowId, logger = console }) => {
    const storageSucceeded = await storeSelectionHandoff({ handoff, storage, logger });

    try {
      await panelOpenPromise;
      log(logger, "debug", `Norn Draft side-panel opened source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}`);
      return storageSucceeded;
    } catch (error) {
      const sidePanelMessage = getErrorMessage(error);

      try {
        await openFallbackWindow();
        log(logger, "warn", `Norn Draft context-menu side-panel fallback used source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}: ${sidePanelMessage}`);
        return storageSucceeded;
      } catch (fallbackError) {
        log(logger, "error", `Norn Draft context-menu workspace opening failed source=${source} windowId=${Number.isInteger(windowId) ? windowId : "invalid"}; side-panel: ${sidePanelMessage}; fallback: ${getErrorMessage(fallbackError)}`);
        return false;
      }
    }
  };

  // Retained for focused handoff tests and callers that do not need a side panel.
  const handleSelectionContextMenuClick = async ({ info, storage, openWindow, logger = console }) => {
    const handoff = createSelectionHandoffFromMenuInfo(info);

    if (!handoff) {
      return false;
    }

    const stored = await storeSelectionHandoff({ handoff, storage, logger });

    if (!stored) {
      return false;
    }

    try {
      await openWindow();
      return true;
    } catch (error) {
      log(logger, "error", `Norn Draft popup/window opening failed menuId=${MENU_ID} selectedTextLength=${handoff.text.length}: ${getErrorMessage(error)}`);
      return false;
    }
  };

  const api = {
    MENU_ID,
    createSelectionHandoffFromMenuInfo,
    storeSelectionHandoff,
    finishSelectionContextMenuAction,
    handleSelectionContextMenuClick
  };
  root.NornDraftContextMenu = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
