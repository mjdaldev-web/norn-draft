# Norn Draft V1.0 Release Notes

Product: Norn Draft

Version: 1.0.0

Release type: V1 browser extension package

## Main Features

- Gemini AI reply generation
- Generate Reply mode
- Rewrite Draft mode
- Multiple tone selection
- Optional context/details
- Copy reply button
- Settings page with local API key storage
- Default tone and reply length settings
- Privacy-friendly V1 behavior

## Installation and Testing

For local testing:

1. Unzip `norn-draft-v1.0.zip` if needed.
2. Open Chrome or Microsoft Edge.
3. Go to the extensions page.
4. Enable Developer mode.
5. Choose Load unpacked.
6. Select the unzipped extension folder containing `manifest.json`.

For store submission:

- Use `norn-draft-v1.0.zip` as the extension package.
- Confirm `manifest.json` is at the ZIP root before uploading.

## Privacy Note

- Norn Draft V1 does not read current page content.
- Only text typed into the popup is sent to Gemini when generating a reply.
- The API key is stored locally using `chrome.storage.local`.
- Generated replies are not stored by the extension.
