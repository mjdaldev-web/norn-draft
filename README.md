# Norn Draft

Norn Draft is a lightweight Manifest V3 browser extension for drafting polished AI-generated replies with tone presets and your own Gemini or OpenAI API key.

## V1 features

- Generate a reply to a message, question, email, or comment
- Rewrite an existing draft reply
- Select one or more tones: Professional, Friendly, Empathetic, Instructional, Short, and Detailed
- Add optional context/details for names, dates, deadlines, case numbers, or background
- Copy the generated reply
- Restore in-progress popup drafts after the extension popup closes
- Store settings locally with `chrome.storage.local`
- Configure Gemini or OpenAI provider, API key, provider model, default tone, and default reply length

## Load unpacked

1. Open Chrome or Edge.
2. Go to the extensions page.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select this project folder.

## Configure AI Provider

1. Open the Norn Draft extension popup.
2. Select **Settings**.
3. Choose **Gemini** or **OpenAI** as the AI provider.
4. Paste the API key for the selected provider into the API key field.
5. Choose the provider model, default tone, and reply length.
6. Select **Save Settings**.

Norn Draft uses the saved API key only when you click **Generate Reply** in the popup.

## Privacy

- V1 does not read the current page.
- Only text you type into the popup, selected tones, selected mode, optional context, and reply length guidance are sent to the chosen AI provider for generation.
- Your API key is stored locally in this browser using `chrome.storage.local`.
- In-progress popup draft state, including the current generated reply, is stored locally so closing the popup does not lose your work.
- Norn Draft does not store a generated-reply history list.
- Norn Draft does not include analytics, tracking, ads, external scripts, or automatic clipboard/page reading.

See [docs/PRIVACY.md](docs/PRIVACY.md) for more detail.

## Current limitations

- One generic API key field is used for the currently selected provider.
- V1 does not read webpage content automatically.

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
- Permissions are limited to `storage`, Gemini API host access, and OpenAI API host access.
- Popup and Options JavaScript syntax checks pass.
- Extension loads as an unpacked Chrome/Edge extension.
- No API keys or secrets are committed.
