(function (root) {
  "use strict";

  const SIDE_PANEL_PREFERENCE_KEY = "nornDraftOpenInSidePanelByDefault";
  const LEGACY_SIDE_PANEL_PREFERENCE_KEY = "openInSidePanelByDefault";
  const QUICK_POPUP_PATH = "popup/popup.html";

  const isSidePanelPreferred = (value) => value === true;

  const normalizeExtensionError = (error, fallbackMessage = "Unknown browser error") => {
    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message.trim();
    }

    const lastErrorMessage = root.chrome?.runtime?.lastError?.message;
    if (typeof lastErrorMessage === "string" && lastErrorMessage.trim()) {
      return lastErrorMessage.trim();
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

    return fallbackMessage;
  };

  const logError = (logger, message, error) => {
    logger.error(`${message}: ${normalizeExtensionError(error)}`);
  };

  const migrateSidePanelPreference = async ({ storage, logger = console }) => {
    try {
      const stored = await storage.get([
        SIDE_PANEL_PREFERENCE_KEY,
        LEGACY_SIDE_PANEL_PREFERENCE_KEY
      ]);
      const hasCorrectValue = typeof stored[SIDE_PANEL_PREFERENCE_KEY] === "boolean";
      const legacyValue = stored[LEGACY_SIDE_PANEL_PREFERENCE_KEY];

      if (hasCorrectValue) {
        if (Object.prototype.hasOwnProperty.call(stored, LEGACY_SIDE_PANEL_PREFERENCE_KEY)) {
          await storage.remove(LEGACY_SIDE_PANEL_PREFERENCE_KEY);
        }
        return stored[SIDE_PANEL_PREFERENCE_KEY];
      }

      if (typeof legacyValue !== "boolean") {
        if (Object.prototype.hasOwnProperty.call(stored, LEGACY_SIDE_PANEL_PREFERENCE_KEY)) {
          await storage.remove(LEGACY_SIDE_PANEL_PREFERENCE_KEY);
        }
        return false;
      }

      await storage.set({ [SIDE_PANEL_PREFERENCE_KEY]: legacyValue });
      await storage.remove(LEGACY_SIDE_PANEL_PREFERENCE_KEY);
      return legacyValue;
    } catch (error) {
      logError(logger, "Norn Draft side-panel preference migration failed", error);
      return false;
    }
  };

  const applyToolbarPreference = async ({ enabled, action, sidePanel, popupPath = QUICK_POPUP_PATH, logger = console }) => {
    const useSidePanel = isSidePanelPreferred(enabled);

    if (!action || typeof action.setPopup !== "function") {
      throw new Error("Chrome action popup controls are unavailable.");
    }

    if (!sidePanel || typeof sidePanel.setPanelBehavior !== "function") {
      throw new Error("Chrome Side Panel toolbar controls are unavailable.");
    }

    if (!useSidePanel) {
      try {
        await sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      } catch (error) {
        logError(logger, "Norn Draft side-panel toolbar behavior could not be disabled", error);
        throw error;
      }

      try {
        await action.setPopup({ popup: popupPath });
      } catch (error) {
        logError(logger, "Norn Draft action popup could not be restored", error);
        throw error;
      }

      return false;
    }

    try {
      await action.setPopup({ popup: "" });
    } catch (error) {
      logError(logger, "Norn Draft action popup could not be removed", error);
      throw error;
    }

    try {
      await sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      logError(logger, "Norn Draft side-panel toolbar behavior could not be enabled", error);
      try {
        await action.setPopup({ popup: popupPath });
      } catch (restoreError) {
        logError(logger, "Norn Draft action popup rollback failed", restoreError);
      }
      throw error;
    }

    return true;
  };

  const openSidePanel = ({ sidePanel, windowId }) => {
    if (!sidePanel || typeof sidePanel.open !== "function" || !Number.isInteger(windowId)) {
      return Promise.reject(new Error("Chrome Side Panel is unavailable for this window."));
    }

    return sidePanel.open({ windowId });
  };

  const api = {
    SIDE_PANEL_PREFERENCE_KEY,
    LEGACY_SIDE_PANEL_PREFERENCE_KEY,
    QUICK_POPUP_PATH,
    isSidePanelPreferred,
    normalizeExtensionError,
    migrateSidePanelPreference,
    applyToolbarPreference,
    openSidePanel
  };

  root.NornDraftSidePanel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
