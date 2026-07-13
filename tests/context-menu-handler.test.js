const assert = require("assert");
const handoff = require("../shared/selection-handoff.js");
const contextMenu = require("../shared/context-menu-handler.js");

global.NornDraftSelectionHandoff = handoff;

const createLogger = () => {
  const entries = [];
  return {
    entries,
    error(message, details) {
      entries.push({ level: "error", message, details });
    },
    warn(message, details) {
      entries.push({ level: "warn", message, details });
    },
    debug(message, details) {
      entries.push({ level: "debug", message, details });
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

  const panelHandoff = contextMenu.createSelectionHandoffFromMenuInfo({
    menuItemId: contextMenu.MENU_ID,
    selectionText: "Open in side panel"
  });
  assert.equal(panelHandoff.text, "Open in side panel");

  let panelStarted = false;
  const orderingStorage = {
    async set() {
      assert.equal(panelStarted, true, "sidePanel.open must start before storage is awaited");
    }
  };
  const panelOpenPromise = (() => {
    panelStarted = true;
    return Promise.resolve();
  })();
  let fallbackOpened = 0;
  assert.equal(await contextMenu.finishSelectionContextMenuAction({
    handoff: panelHandoff,
    storage: orderingStorage,
    panelOpenPromise,
    openFallbackWindow: async () => { fallbackOpened += 1; },
    logger: createLogger(),
    windowId: 41
  }), true);
  assert.equal(fallbackOpened, 0);

  let rejectedFallbackOpened = 0;
  const fallbackLogger = createLogger();
  assert.equal(await contextMenu.finishSelectionContextMenuAction({
    handoff: panelHandoff,
    storage: createStorage(),
    panelOpenPromise: Promise.reject(new Error("side panel rejected")),
    openFallbackWindow: async () => { rejectedFallbackOpened += 1; },
    logger: fallbackLogger,
    windowId: 41
  }), true);
  assert.equal(rejectedFallbackOpened, 1);
  assert.equal(fallbackLogger.entries.some((entry) => entry.level === "error"), false);
  assert.equal(fallbackLogger.entries.some((entry) => entry.level === "warn"), true);
  assert.equal(JSON.stringify(fallbackLogger.entries).includes("[object Object]"), false);

  const failedFallbackLogger = createLogger();
  assert.equal(await contextMenu.finishSelectionContextMenuAction({
    handoff: panelHandoff,
    storage: createStorage(),
    panelOpenPromise: Promise.reject({ code: "EDGE_PANEL" }),
    openFallbackWindow: async () => { throw new Error("window blocked"); },
    logger: failedFallbackLogger,
    windowId: undefined
  }), false);
  assert.equal(failedFallbackLogger.entries.some((entry) => entry.level === "error"), true);
  assert.equal(JSON.stringify(failedFallbackLogger.entries).includes("[object Object]"), false);

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
  assert.equal(failingLogger.entries[0].message.includes("selectedTextLength=20"), true);

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
