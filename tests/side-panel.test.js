const assert = require("assert");
const sidePanel = require("../shared/side-panel.js");

(async () => {
  assert.equal(sidePanel.SIDE_PANEL_PREFERENCE_KEY, "nornDraftOpenInSidePanelByDefault");
  assert.equal(sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY, "openInSidePanelByDefault");
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
    ["behavior", { openPanelOnActionClick: false }],
    ["popup", { popup: "popup/popup.html" }]
  ]);

  let openedWindowId = null;
  await sidePanel.openSidePanel({ sidePanel: { open: async ({ windowId }) => { openedWindowId = windowId; } }, windowId: 18 });
  assert.equal(openedWindowId, 18);
  await assert.rejects(() => sidePanel.openSidePanel({ sidePanel: undefined, windowId: 18 }));
  await assert.rejects(() => sidePanel.openSidePanel({ sidePanel: { open: async () => {} }, windowId: undefined }));

  const createStorage = (initial) => {
    const values = { ...initial };
    const calls = [];
    return {
      values,
      calls,
      async get(keys) {
        return keys.reduce((result, key) => ({ ...result, ...(Object.prototype.hasOwnProperty.call(values, key) ? { [key]: values[key] } : {}) }), {});
      },
      async set(value) {
        calls.push(["set", value]);
        Object.assign(values, value);
      },
      async remove(key) {
        calls.push(["remove", key]);
        delete values[key];
      }
    };
  };

  const migratedStorage = createStorage({ [sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY]: true });
  assert.equal(await sidePanel.migrateSidePanelPreference({ storage: migratedStorage }), true);
  assert.equal(migratedStorage.values[sidePanel.SIDE_PANEL_PREFERENCE_KEY], true);
  assert.equal(Object.hasOwn(migratedStorage.values, sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY), false);

  const correctStorage = createStorage({
    [sidePanel.SIDE_PANEL_PREFERENCE_KEY]: false,
    [sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY]: true
  });
  assert.equal(await sidePanel.migrateSidePanelPreference({ storage: correctStorage }), false);
  assert.equal(correctStorage.values[sidePanel.SIDE_PANEL_PREFERENCE_KEY], false);
  assert.equal(Object.hasOwn(correctStorage.values, sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY), false);

  const invalidLegacyStorage = createStorage({ [sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY]: "true" });
  assert.equal(await sidePanel.migrateSidePanelPreference({ storage: invalidLegacyStorage }), false);
  assert.equal(Object.hasOwn(invalidLegacyStorage.values, sidePanel.SIDE_PANEL_PREFERENCE_KEY), false);
  assert.equal(Object.hasOwn(invalidLegacyStorage.values, sidePanel.LEGACY_SIDE_PANEL_PREFERENCE_KEY), false);

  console.log("side-panel tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
