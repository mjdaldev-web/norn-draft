(function (root) {
  "use strict";

  const SELECTION_HANDOFF_STORAGE_KEY = "nornDraftPendingSelection";
  const SELECTION_HANDOFF_SCHEMA_VERSION = 1;
  const MAX_SELECTED_TEXT_LENGTH = 12000;
  const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000;

  const normalizeSelectedText = (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const characters = Array.from(trimmed);
    const wasTruncated = characters.length > MAX_SELECTED_TEXT_LENGTH;
    const text = characters.slice(0, MAX_SELECTED_TEXT_LENGTH).join("");

    return { text, wasTruncated };
  };

  const isFreshTimestamp = (value, now = Date.now()) => {
    const timestamp = Date.parse(value);
    return !Number.isNaN(timestamp) && now - timestamp <= HANDOFF_MAX_AGE_MS;
  };

  const createSelectionHandoff = ({ selectionText, now = new Date().toISOString() }) => {
    const normalized = normalizeSelectedText(selectionText);

    if (!normalized) {
      return null;
    }

    return {
      schemaVersion: SELECTION_HANDOFF_SCHEMA_VERSION,
      text: normalized.text,
      createdAt: now,
      wasTruncated: normalized.wasTruncated
    };
  };

  const sanitizeSelectionHandoff = (value, now = Date.now()) => {
    if (!value || typeof value !== "object" || value.schemaVersion !== SELECTION_HANDOFF_SCHEMA_VERSION) {
      return null;
    }

    if (typeof value.createdAt !== "string" || !isFreshTimestamp(value.createdAt, now)) {
      return null;
    }

    const normalized = normalizeSelectedText(value.text);

    if (!normalized) {
      return null;
    }

    return {
      schemaVersion: SELECTION_HANDOFF_SCHEMA_VERSION,
      text: normalized.text,
      createdAt: value.createdAt,
      wasTruncated: Boolean(value.wasTruncated || normalized.wasTruncated)
    };
  };

  const api = {
    SELECTION_HANDOFF_STORAGE_KEY,
    SELECTION_HANDOFF_SCHEMA_VERSION,
    MAX_SELECTED_TEXT_LENGTH,
    HANDOFF_MAX_AGE_MS,
    normalizeSelectedText,
    createSelectionHandoff,
    sanitizeSelectionHandoff
  };

  root.NornDraftSelectionHandoff = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
