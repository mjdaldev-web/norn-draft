(function (root) {
  "use strict";

  const SIDE_PANEL_PREFERENCE_KEY = "nornDraftOpenInSidePanelByDefault";
  const LEGACY_SIDE_PANEL_PREFERENCE_KEY = "openInSidePanelByDefault";
  const QUICK_POPUP_PATH = "popup/popup.html";

  const isSidePanelPreferred = (value) => value === true;

  const getErrorMessage = (error) => error?.message || "Unknown browser error";

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
      logger.error("Norn Draft side-panel preference migration failed.", {
        operation: "migrate side-panel preference",
        error: getErrorMessage(error)
      });
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
        logger.error("Norn Draft side-panel toolbar behavior could not be disabled.", {
          operation: "disable side-panel toolbar behavior",
          error: getErrorMessage(error)
        });
        throw error;
      }

      try {
        await action.setPopup({ popup: popupPath });
      } catch (error) {
        logger.error("Norn Draft action popup could not be restored.", {
          operation: "restore action popup",
          error: getErrorMessage(error)
        });
        throw error;
      }

      return false;
    }

    try {
      await action.setPopup({ popup: "" });
    } catch (error) {
      logger.error("Norn Draft action popup could not be removed.", {
        operation: "remove action popup",
        error: getErrorMessage(error)
      });
      throw error;
    }

    try {
      await sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      logger.error("Norn Draft side-panel toolbar behavior could not be enabled.", {
        operation: "enable side-panel toolbar behavior",
        error: getErrorMessage(error)
      });
      try {
        await action.setPopup({ popup: popupPath });
      } catch (restoreError) {
        logger.error("Norn Draft action popup rollback failed.", {
          operation: "rollback action popup",
          error: getErrorMessage(restoreError)
        });
      }
      throw error;
    }

    return true;
  };

  const openSidePanel = ({ sidePanel, windowId }) => {
    if (!sidePanel || typeof sidePanel.open !== "function" || typeof windowId !== "number") {
      return Promise.reject(new Error("Chrome Side Panel is unavailable for this window."));
    }

    return sidePanel.open({ windowId });
  };

  const api = {
    SIDE_PANEL_PREFERENCE_KEY,
    LEGACY_SIDE_PANEL_PREFERENCE_KEY,
    QUICK_POPUP_PATH,
    isSidePanelPreferred,
    migrateSidePanelPreference,
    applyToolbarPreference,
    openSidePanel
  };

  root.NornDraftSidePanel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
