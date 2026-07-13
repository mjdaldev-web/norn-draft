const assert = require("assert");
const handoff = require("../shared/selection-handoff.js");
const contextMenu = require("../shared/context-menu-handler.js");

global.NornDraftSelectionHandoff = handoff;

const createLogger = () => {
  const entries = [];
  return {
    entries,
    error(message, details) {
      entries.push({ message, details });
    }
  };
};

const createStorage = () => {
  const calls = [];
  return {
    calls,
    async set(value) {
      calls.push(value);
    }
  };
};

(async () => {
  const storage = createStorage();
  const logger = createLogger();
  let opened = 0;
  const accepted = await contextMenu.handleSelectionContextMenuClick({
    info: {
      menuItemId: "norn-draft-open-selection",
      selectionText: "Selected text"
    },
    storage,
    openWindow: async () => {
      opened += 1;
    },
    logger
  });

  assert.equal(accepted, true);
  assert.equal(opened, 1);
  assert.equal(storage.calls.length, 1);
  assert.deepEqual(storage.calls[0][handoff.SELECTION_HANDOFF_STORAGE_KEY].text, "Selected text");
  assert.equal(logger.entries.length, 0);

  const ignoredStorage = createStorage();
  const ignored = await contextMenu.handleSelectionContextMenuClick({
    info: { menuItemId: "other-menu", selectionText: "Should not be used" },
    storage: ignoredStorage,
    openWindow: async () => {
      throw new Error("must not open");
    },
    logger: createLogger()
  });
  assert.equal(ignored, false);
  assert.equal(ignoredStorage.calls.length, 0);

  for (const selectionText of ["", "   \n\t"]) {
    const emptyStorage = createStorage();
    const empty = await contextMenu.handleSelectionContextMenuClick({
      info: { menuItemId: contextMenu.MENU_ID, selectionText },
      storage: emptyStorage,
      openWindow: async () => {
        throw new Error("must not open");
      },
      logger: createLogger()
    });
    assert.equal(empty, false);
    assert.equal(emptyStorage.calls.length, 0);
  }

  const failingLogger = createLogger();
  const failingStorage = {
    async set() {
      throw new Error("storage unavailable");
    }
  };
  await contextMenu.handleSelectionContextMenuClick({
    info: { menuItemId: contextMenu.MENU_ID, selectionText: "Do not log this text" },
    storage: failingStorage,
    openWindow: async () => {},
    logger: failingLogger
  });
  assert.equal(failingLogger.entries.length, 1);
  assert.equal(JSON.stringify(failingLogger.entries).includes("Do not log this text"), false);
  assert.equal(failingLogger.entries[0].details.selectedTextLength, 20);

  const unicode = handoff.createSelectionHandoff({
    selectionText: "😀".repeat(handoff.MAX_SELECTED_TEXT_LENGTH + 10),
    now: "2026-07-13T00:00:00.000Z"
  });
  assert.equal(Array.from(unicode.text).length, 12000);
  assert.equal(unicode.wasTruncated, true);
  assert.equal(unicode.text.endsWith("😀"), true);

  console.log("context-menu handler tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
