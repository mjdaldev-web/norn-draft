const assert = require("assert");
const handoff = require("../shared/selection-handoff.js");

const now = "2026-07-13T00:00:00.000Z";
const created = handoff.createSelectionHandoff({
  selectionText: "  First line\nSecond line  ",
  now
});

assert.equal(created.text, "First line\nSecond line");
assert.equal(created.wasTruncated, false);
assert.deepEqual(handoff.sanitizeSelectionHandoff(created, Date.parse(now)), created);
assert.equal(handoff.normalizeSelectedText("   \n  "), null);
assert.equal(handoff.createSelectionHandoff({ selectionText: 123, now }), null);

const unicode = handoff.createSelectionHandoff({
  selectionText: "😀".repeat(handoff.MAX_SELECTED_TEXT_LENGTH + 10),
  now
});
assert.equal(Array.from(unicode.text).length, handoff.MAX_SELECTED_TEXT_LENGTH);
assert.equal(unicode.text.endsWith("😀"), true);
assert.equal(unicode.wasTruncated, true);

assert.equal(handoff.sanitizeSelectionHandoff({ ...created, schemaVersion: 2 }, Date.parse(now)), null);
assert.equal(handoff.sanitizeSelectionHandoff({ ...created, createdAt: "2020-01-01T00:00:00.000Z" }, Date.parse(now)), null);

console.log("selection-handoff tests passed");
