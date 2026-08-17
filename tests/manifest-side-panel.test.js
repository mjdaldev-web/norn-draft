const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, "2.0.0");
assert.ok(manifest.permissions.includes("sidePanel"));
assert.deepEqual(manifest.host_permissions, [
  "https://generativelanguage.googleapis.com/*",
  "https://api.openai.com/*"
]);
assert.equal(manifest.content_scripts, undefined);
assert.equal(manifest.side_panel.default_path, "sidepanel/sidepanel.html");
assert.ok(fs.existsSync(path.join(root, manifest.side_panel.default_path)));
assert.ok(fs.existsSync(path.join(root, manifest.action.default_popup)));
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
assert.match(background, /contextMenus\.onClicked\.addListener\(\(info, tab\)/);
assert.match(background, /chrome\.sidePanel\.open\(\{ windowId \}\)/);
assert.match(background, /void CONTEXT_MENU\.finishSelectionContextMenuAction/);
assert.ok(background.indexOf("chrome.sidePanel.open({ windowId })") < background.indexOf("finishSelectionContextMenuAction"));
assert.match(background, /SIDE_PANEL\.SIDE_PANEL_PREFERENCE_KEY/);
assert.match(background, /console\.warn\(`Norn Draft side panel could not open; using fallback/);
assert.doesNotMatch(background, /console\.error\("Norn Draft side panel could not open; using the extension window fallback/);
assert.match(background, /sidePanelAlreadyAttempted: message\.sidePanelAlreadyAttempted === true/);
const optionsScript = fs.readFileSync(path.join(root, "options", "options.js"), "utf8");
assert.match(optionsScript, /NornDraftSidePanel\.SIDE_PANEL_PREFERENCE_KEY/);
assert.doesNotMatch(optionsScript, /openInSidePanelByDefault/);
console.log("side-panel manifest tests passed");
