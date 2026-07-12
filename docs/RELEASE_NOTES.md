# Norn Draft V1.6.0 Release Readiness Notes

Norn Draft V1.6 is the current release-ready browser extension state before creating the final V1.6 package.

## Branding

- Refreshed the bundled Norn Draft logo and generated 16, 32, 48, and 128 pixel runtime icons.
- Added compact About information to Settings > Privacy for Mark Dalmacio (`mjdaldev`).
- Updated privacy wording to clarify that content is processed only after an explicit draft or rewrite request and may be sent to the selected AI provider.

## Highlights

- Draft replies from messages, questions, emails, or comments
- Rewrite existing draft replies
- Select multiple tones in the popup
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

- Norn Draft only processes content after an explicit draft or rewrite request and does not read the current page.
- Only text typed into the popup, selected tones, selected mode, optional context, and reply length guidance are sent to the selected AI provider when generating.
- Gemini and OpenAI API keys are stored separately and locally in this browser.
- API keys are never saved in history and are never sent to the other provider.
- Local reply history is optional and disabled by default.
- Basic history stores generated replies and basic metadata only.
- Detailed history stores the original message/draft and optional context locally only when explicitly selected.

## Current Limitations

- V1.6 does not read webpage content automatically.
- Provider generation depends on the user's API key, project access, quota, and selected model.
- Local history and popup draft state stay on this browser only.

## Performance Notes

- Norn Draft uses plain HTML, CSS, and JavaScript with no framework runtime or build-tool bundle.
- AI generation is handled by the selected provider's API, not by local processing.
- Local history is capped to the configured 10 or 20 latest replies to keep popup and Settings rendering responsive.
- Detailed history entries use scrollable text blocks so long saved replies or context do not expand the whole page indefinitely.

## V1.6 Manual Test Checklist

- Manifest V3 configured
- Permissions limited to `storage`, Gemini API host access, and OpenAI API host access
- Gemini generation works with the selected Gemini model
- OpenAI generation works with the selected OpenAI model
- Provider switching preserves separate provider keys
- Missing API key and invalid model errors are friendly and handled in the popup
- Popup draft persistence and Clear button work
- History off, Basic history, and Detailed history behave as documented
- Settings tabs work without losing unsaved form values
- Popup and Options JavaScript syntax checks pass
- Unpacked Chrome/Edge extension load check passes
- No hardcoded API keys or secrets found
