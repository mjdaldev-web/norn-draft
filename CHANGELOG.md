# Changelog

## 1.2.0

- Added Gemini model selection in Settings.
- Limited the preset list to verified working Flash options with Custom model names for advanced access.
- Added Custom Gemini model name storage and validation.
- Improved Gemini model-specific error clarity.

## 1.1.0

- Added persistent popup draft state in `chrome.storage.local`.
- Added auto-save for typed popup content, selected tones, mode, context, and generated output.
- Added a Clear button that resets popup draft state without clearing settings or API keys.
- Added auto-clearing popup status messages.

## 1.0.0

- Added polished popup UI for reply drafting and draft rewriting.
- Added multi-tone selection with at least one tone required.
- Added optional context/details input.
- Added Gemini reply generation using the user's saved API key.
- Added copy-to-clipboard support for generated replies.
- Added Options settings for AI provider, API key, default tone, and default reply length.
- Added local settings storage with `chrome.storage.local`.
- Added privacy/security documentation and V1 release notes.
- Updated Manifest V3 metadata for the first usable release.

## 0.1.0

- Created the initial Norn Draft extension scaffold.
- Added Manifest V3 support.
- Added popup and options page files.
- Added documentation and icon placeholder folders.
