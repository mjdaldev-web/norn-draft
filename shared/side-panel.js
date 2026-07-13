(function (root) {
  "use strict";

  const SIDE_PANEL_PREFERENCE_KEY = "nornDraftOpenInSidePanelByDefault";
  const QUICK_POPUP_PATH = "popup/popup.html";

  const isSidePanelPreferred = (value) => value === true;

  const applyToolbarPreference = async ({ enabled, action, sidePanel }) => {
    const useSidePanel = isSidePanelPreferred(enabled);

    // A manifest action popup prevents action clicks from reaching the service
    // worker. Set it dynamically so the same toolbar button can safely switch
    // between the quick popup and Chrome's side-panel action behavior.
    await action.setPopup({ popup: useSidePanel ? "" : QUICK_POPUP_PATH });
    await sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidePanel });
    return useSidePanel;
  };

  const openSidePanel = async ({ sidePanel, windowId }) => {
    if (!sidePanel || typeof sidePanel.open !== "function" || typeof windowId !== "number") {
      throw new Error("Chrome Side Panel is unavailable for this window.");
    }

    await sidePanel.open({ windowId });
  };

  const api = {
    SIDE_PANEL_PREFERENCE_KEY,
    QUICK_POPUP_PATH,
    isSidePanelPreferred,
    applyToolbarPreference,
    openSidePanel
  };

  root.NornDraftSidePanel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
