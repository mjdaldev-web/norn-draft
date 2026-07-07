# Norn Draft V1.5.0 Release Notes

Product: Norn Draft

Version: 1.5.0

Release type: Browser extension package

## Main Features

- Gemini AI reply generation
- OpenAI AI reply generation
- Provider-specific Gemini and OpenAI API keys
- Gemini model selection
- OpenAI model selection
- Generate Reply mode
- Rewrite Draft mode
- Multiple tone selection
- Optional context/details
- Persistent popup draft state
- Clear button
- Copy reply button
- Optional local reply history
- Basic and Detailed history modes
- Settings tabs for General, AI Models, History, and Privacy
- Privacy-focused local storage behavior

## Installation and Testing

For local testing:

1. Unzip `norn-draft-v1.5.zip` if needed.
2. Open Chrome or Microsoft Edge.
3. Go to the extensions page.
4. Enable Developer mode.
5. Choose Load unpacked.
6. Select the unzipped extension folder containing `manifest.json`.

For extension store submission:

- Use `norn-draft-v1.5.zip` as the release package.
- Confirm `manifest.json` is at the ZIP root before uploading.

## Privacy Note

- Norn Draft does not read current page content in V1.5.
- Only text typed into the popup is sent to the selected AI provider when Generate is clicked.
- Gemini and OpenAI API keys are stored separately and locally using `chrome.storage.local`.
- API keys are never stored in history.
- History is optional and locally stored.
- Basic history stores generated replies and metadata only.
- Detailed history stores original message/draft and context only when explicitly enabled.

## Package Notes

- The package contains only the Manifest V3 extension files and safe release documentation.
- No API keys, local browser storage files, private agent instructions, git metadata, or nested release artifacts are included.
