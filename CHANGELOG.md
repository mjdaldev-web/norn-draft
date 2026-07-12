# Changelog

## 1.6.0

- Refreshed Norn Draft branding with the updated bundled logo and runtime icon sizes.
- Added About information for Mark Dalmacio (`mjdaldev`) to Settings > Privacy.
- Updated privacy wording to accurately describe explicit processing and external AI provider requests.
- Confirmed extension permissions and draft-generation behavior are unchanged.

## 1.5.0

- Prepared V1.5 release readiness with current Gemini and OpenAI provider support.
- Confirmed provider-specific Gemini and OpenAI API key behavior remains local and separate.
- Refreshed release documentation for V1.5 features, privacy behavior, history controls, and manual testing.
- Confirmed permissions remain limited to storage plus Gemini and OpenAI API hosts.
- Added low-spec readiness notes and capped Settings history rendering/saving to the configured history limit.

## 1.4.2

- Moved AI provider and API key settings into the AI Models tab.
- Added separate local storage for Gemini and OpenAI API keys.
- Added provider-specific API key labels, placeholders, and clear behavior.
- Improved provider switching so saved keys remain available when switching back.
- Updated privacy wording for separate local API key storage.

## 1.4.1

- Added a tabbed Settings page with General, AI Models, History, and Privacy sections.
- Added Basic and Detailed local history storage modes.
- Added a detailed history privacy warning before storing original messages or context.
- Added a detailed Settings history manager with copy, restore, delete, and clear actions.
- Updated privacy documentation for detailed history controls.

## 1.4.0

- Added optional local reply history, disabled by default.
- Stored generated replies and basic metadata only when local history is enabled.
- Added compact popup history with restore, copy, delete, and clear actions.
- Added Settings controls for enabling local history, choosing a 10 or 20 item limit, and clearing history.

## 1.3.0

- Added OpenAI provider integration using the OpenAI Responses API.
- Added OpenAI model selection with Recommended, GPT-5.4 mini, GPT-5.5, and Custom model options.
- Added OpenAI custom model name storage and validation.
- Kept Gemini model selection unchanged.
- Updated provider-specific API key, model, quota, and access error handling.

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
