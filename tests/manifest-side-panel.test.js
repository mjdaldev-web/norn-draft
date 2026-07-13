const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, "1.9.0");
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
assert.match(background, /openWorkspace: \(\) => openNornDraftWorkspace\(\{ tab \}\)/);
console.log("side-panel manifest tests passed");
