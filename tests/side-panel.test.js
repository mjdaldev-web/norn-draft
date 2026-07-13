const assert = require("assert");
const sidePanel = require("../shared/side-panel.js");

(async () => {
  assert.equal(sidePanel.SIDE_PANEL_PREFERENCE_KEY, "nornDraftOpenInSidePanelByDefault");
  assert.equal(sidePanel.isSidePanelPreferred(true), true);
  assert.equal(sidePanel.isSidePanelPreferred("true"), false);
  assert.equal(sidePanel.isSidePanelPreferred(undefined), false);

  const calls = [];
  const action = { setPopup: async (value) => calls.push(["popup", value]) };
  const panel = { setPanelBehavior: async (value) => calls.push(["behavior", value]) };
  assert.equal(await sidePanel.applyToolbarPreference({ enabled: true, action, sidePanel: panel }), true);
  assert.deepEqual(calls, [
    ["popup", { popup: "" }],
    ["behavior", { openPanelOnActionClick: true }]
  ]);

  calls.length = 0;
  assert.equal(await sidePanel.applyToolbarPreference({ enabled: false, action, sidePanel: panel }), false);
  assert.deepEqual(calls, [
    ["popup", { popup: "popup/popup.html" }],
    ["behavior", { openPanelOnActionClick: false }]
  ]);

  let openedWindowId = null;
  await sidePanel.openSidePanel({ sidePanel: { open: async ({ windowId }) => { openedWindowId = windowId; } }, windowId: 18 });
  assert.equal(openedWindowId, 18);
  await assert.rejects(() => sidePanel.openSidePanel({ sidePanel: undefined, windowId: 18 }));
  await assert.rejects(() => sidePanel.openSidePanel({ sidePanel: { open: async () => {} }, windowId: undefined }));

  console.log("side-panel tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
