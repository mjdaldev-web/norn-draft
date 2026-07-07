# Norn Draft

Norn Draft is a lightweight Manifest V3 browser extension for drafting polished AI-generated replies with tone presets and your own Gemini API key.

## V1 features

- Generate a reply to a message, question, email, or comment
- Rewrite an existing draft reply
- Select one or more tones: Professional, Friendly, Empathetic, Instructional, Short, and Detailed
- Add optional context/details for names, dates, deadlines, case numbers, or background
- Copy the generated reply
- Restore in-progress popup drafts after the extension popup closes
- Store settings locally with `chrome.storage.local`
- Configure Gemini provider, API key, default tone, and default reply length

## Load unpacked

1. Open Chrome or Edge.
2. Go to the extensions page.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select this project folder.

## Configure Gemini

1. Open the Norn Draft extension popup.
2. Select **Settings**.
3. Choose **Gemini** as the AI provider.
4. Paste your Gemini API key into the API key field.
5. Choose a default tone and reply length.
6. Select **Save Settings**.

Norn Draft uses the saved Gemini API key only when you click **Generate Reply** in the popup.

## Privacy

- V1 does not read the current page.
- Only text you type into the popup is used for generation.
- Your API key is stored locally in this browser using `chrome.storage.local`.
- In-progress popup draft state, including the current generated reply, is stored locally so closing the popup does not lose your work.
- Norn Draft does not store a generated-reply history list.
- Norn Draft does not include analytics, tracking, ads, external scripts, or automatic clipboard/page reading.

See [docs/PRIVACY.md](docs/PRIVACY.md) for more detail.

## Current limitations

- Gemini is the only connected AI provider in V1.
- OpenAI can be selected in settings, but generation is not connected yet.
- There is no model selector UI yet.
- V1 does not read webpage content automatically.
- Extension icons are placeholder-only until final artwork is added.

## Project Structure

- `manifest.json`
- `popup/`
- `options/`
- `docs/`
- `icons/`

## Icons

Extension icons are generated from `icons/norn-draft-logo.png` and wired into the manifest at the required sizes.

## Release Checklist

- Manifest V3 is configured.
- Permissions are limited to `storage` and Gemini API host access.
- Popup and Options JavaScript syntax checks pass.
- Extension loads as an unpacked Chrome/Edge extension.
- No API keys or secrets are committed.
