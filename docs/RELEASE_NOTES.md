# Norn Draft V1.0.0 Release Notes

Norn Draft V1.0.0 is the first usable release of the browser extension.

## Highlights

- Draft replies from messages, questions, emails, or comments
- Rewrite existing draft replies
- Select multiple tones in the popup
- Add optional context/details
- Generate replies with Gemini using your own API key
- Copy generated replies to the clipboard
- Save settings locally with `chrome.storage.local`

## Supported Browsers

- Chrome
- Microsoft Edge

## Setup

1. Load the project folder as an unpacked extension.
2. Open the popup.
3. Open Settings.
4. Select Gemini and add your Gemini API key.
5. Save settings.
6. Return to the popup and generate a reply.

## Privacy Notes

- V1 does not read the current page.
- Only text typed into the popup is used for generation.
- API keys are stored locally in this browser.
- Generated replies are not stored by the extension.

## Current Limitations

- Gemini is the only connected provider.
- OpenAI support is not connected yet.
- There is no model selector UI yet.
- Icons are still placeholder-only.

## V1 Release Checklist

- Manifest V3 configured
- Popup and Options UI complete
- Minimal permissions confirmed
- Gemini host permission limited to `generativelanguage.googleapis.com`
- JavaScript syntax checks pass
- Unpacked extension load check passes
- No hardcoded API keys or secrets found
