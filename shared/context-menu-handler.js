(function (root) {
  "use strict";

  const MENU_ID = "norn-draft-open-selection";

  const getErrorMessage = (error) => error?.message || "Unknown browser error";

  const handleSelectionContextMenuClick = async ({ info, storage, openWindow, logger = console }) => {
    if (!info || info.menuItemId !== MENU_ID) {
      return false;
    }

    try {
      const handoff = root.NornDraftSelectionHandoff.createSelectionHandoff({
        selectionText: info.selectionText
      });

      if (!handoff) {
        return false;
      }

      try {
        await storage.set({
          [root.NornDraftSelectionHandoff.SELECTION_HANDOFF_STORAGE_KEY]: handoff
        });
      } catch (error) {
        logger.error("Norn Draft pending-selection storage failed.", {
          operation: "store pending selection",
          menuId: MENU_ID,
          selectedTextLength: handoff.text.length,
          error: getErrorMessage(error)
        });
        return false;
      }

      try {
        await openWindow();
      } catch (error) {
        logger.error("Norn Draft popup/window opening failed.", {
          operation: "open extension window",
          menuId: MENU_ID,
          selectedTextLength: handoff.text.length,
          error: getErrorMessage(error)
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Norn Draft context-menu handler failed.", {
        operation: "handle selected-text context menu",
        menuId: MENU_ID,
        error: getErrorMessage(error)
      });
      return false;
    }
  };

  const api = { MENU_ID, handleSelectionContextMenuClick };
  root.NornDraftContextMenu = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
