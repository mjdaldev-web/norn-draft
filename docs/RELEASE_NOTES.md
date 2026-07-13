# Norn Draft V1.8.0 Release Readiness Notes

Norn Draft V1.8 adds explicit right-click selected-text support while preserving the V1.7 custom preset workflow.

## Right-Click Selected Text

- Added **Open selection in Norn Draft** for highlighted webpage text.
- Transfers only the selected text through a short-lived local handoff.
- Opens the existing Norn Draft popup UI in an extension-owned window for review.
- Does not generate or send an AI request until the user clicks the existing action.
- Does not read the surrounding page or add site-aware context.

## Prompt Presets and Custom Tones

- Added editable custom tone presets with local-only storage.
- Preserved all existing built-in tone chips and their prompt behavior.
- Added a compact popup selector for custom presets and safe fallback when a selected preset is deleted.

## Highlights

- Draft replies from messages, questions, emails, or comments
- Rewrite existing draft replies
- Select multiple tones in the popup
- Create, edit, delete, and select local custom tone presets
- Add optional context/details
- Generate replies with Gemini or OpenAI using your own provider-specific API key
- Select Gemini and OpenAI model presets or enter custom model names
- Copy generated replies to the clipboard
- Restore in-progress popup drafts after the popup closes
- Optionally save local reply history, disabled by default
- Choose Basic history for generated replies and metadata only, or Detailed history to also save original message/draft and context locally
- Manage local history with restore, copy, delete, and clear actions
- Save settings locally with `chrome.storage.local`

## Supported Browsers

- Chrome
- Microsoft Edge

## Setup

1. Load the project folder as an unpacked extension.
2. Open the popup.
3. Open Settings.
4. Open the AI Models tab.
5. Select Gemini or OpenAI.
6. Add the selected provider's API key.
7. Choose the provider model.
8. Save settings.
9. Return to the popup and generate a reply.

## Privacy Notes

- Norn Draft only processes content after an explicit draft or rewrite request, or after the user explicitly chooses the selected-text context-menu action to prepare local draft context.
- Only text reviewed in the popup, selected tones or custom preset guidance, selected mode, optional context, and reply length guidance are sent to the selected AI provider when generating.
- Gemini and OpenAI API keys are stored separately and locally in this browser.
- API keys are never saved in history and are never sent to the other provider.
- Local reply history is optional and disabled by default.
- Basic history stores generated replies and basic metadata only.
- Detailed history stores the original message/draft and optional context locally only when explicitly selected.

## Current Limitations

- V1.8 does not read webpage content automatically or monitor selections; only explicitly selected text is handed off.
- Provider generation depends on the user's API key, project access, quota, and selected model.
- Local history and popup draft state stay on this browser only.

## Performance Notes

- Norn Draft uses plain HTML, CSS, and JavaScript with no framework runtime or build-tool bundle.
- AI generation is handled by the selected provider's API, not by local processing.
- Local history is capped to the configured 10 or 20 latest replies to keep popup and Settings rendering responsive.
- Detailed history entries use scrollable text blocks so long saved replies or context do not expand the whole page indefinitely.

## V1.7 Manual Test Checklist

- Manifest V3 configured
- Permissions limited to `storage` and `contextMenus`, plus Gemini and OpenAI API host access
- Gemini generation works with the selected Gemini model
- OpenAI generation works with the selected OpenAI model
- Provider switching preserves separate provider keys
- Missing API key and invalid model errors are friendly and handled in the popup
- Popup draft persistence and Clear button work
- History off, Basic history, and Detailed history behave as documented
- Settings tabs work without losing unsaved form values
- Custom presets validate names and instructions, persist locally, and work for both draft and rewrite modes
- Popup and Options JavaScript syntax checks pass
- Unpacked Chrome/Edge extension load check passes
- No hardcoded API keys or secrets found
