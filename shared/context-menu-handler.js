(function (root) {
  "use strict";

  const MENU_ID = "norn-draft-open-selection";

  const getErrorMessage = (error) => error?.message || "Unknown browser error";

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
      logger.error("Norn Draft pending-selection storage failed.", {
        operation: "store pending selection",
        menuId: MENU_ID,
        selectedTextLength: handoff.text.length,
        error: getErrorMessage(error)
      });
      return false;
    }
  };

  const finishSelectionContextMenuAction = async ({ handoff, storage, panelOpenPromise, openFallbackWindow, logger = console }) => {
    const storageSucceeded = await storeSelectionHandoff({ handoff, storage, logger });

    try {
      await panelOpenPromise;
      return storageSucceeded;
    } catch (error) {
      logger.error("Norn Draft context-menu side panel opening failed.", {
        operation: "open side panel from context menu",
        menuId: MENU_ID,
        selectedTextLength: handoff.text.length,
        error: getErrorMessage(error)
      });

      try {
        await openFallbackWindow();
        return storageSucceeded;
      } catch (fallbackError) {
        logger.error("Norn Draft context-menu fallback window failed.", {
          operation: "open fallback extension window",
          menuId: MENU_ID,
          selectedTextLength: handoff.text.length,
          error: getErrorMessage(fallbackError)
        });
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
      logger.error("Norn Draft popup/window opening failed.", {
        operation: "open extension window",
        menuId: MENU_ID,
        selectedTextLength: handoff.text.length,
        error: getErrorMessage(error)
      });
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
