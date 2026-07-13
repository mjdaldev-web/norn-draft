# Norn Draft

Norn Draft is a lightweight Manifest V3 browser extension for drafting polished AI-generated replies with tone presets and your own Gemini or OpenAI API key.

## V1.8 features

- Generate a reply to a message, question, email, or comment
- Rewrite an existing draft reply
- Select one or more tones: Professional, Friendly, Empathetic, Instructional, Short, and Detailed
- Create, edit, and delete local custom tone presets with reusable style guidance
- Select a custom preset from the popup when drafting or rewriting
- Right-click selected webpage text and open it in Norn Draft for review
- Add optional context/details for names, dates, deadlines, case numbers, or background
- Generate with Gemini or OpenAI using your own provider-specific API key
- Choose Gemini and OpenAI model presets or use custom model names
- Copy the generated reply
- Restore in-progress popup drafts after the extension popup closes
- Optionally save a local reply history, disabled by default, with Basic and Detailed modes
- Manage saved history locally with restore, copy, delete, and clear actions
- Store settings locally with `chrome.storage.local`
- Configure Gemini or OpenAI provider, provider-specific API keys, provider model, default tone, and default reply length
- View Norn Draft branding and developer information in Settings > Privacy

## Load unpacked

1. Open Chrome or Edge.
2. Go to the extensions page.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select this project folder.

## Configure AI Provider

1. Open the Norn Draft extension popup.
2. Select **Settings**.
3. Open the **AI Models** tab.
4. Choose **Gemini** or **OpenAI** as the AI provider.
5. Paste the API key for the selected provider into its provider-specific API key field.
6. Choose the provider model.
7. Open the **General** tab to choose the default tone and reply length.
8. Select **Save Settings**.

Norn Draft stores Gemini and OpenAI API keys separately and uses only the selected provider's key when you click **Generate Reply** in the popup.

## Privacy

- Norn Draft reads webpage text only after you explicitly choose the context-menu action for highlighted text; it does not read the surrounding page.
- Only text you review in the popup, selected tones or custom preset guidance, selected mode, optional context, and reply length guidance are sent to the chosen AI provider for generation.
- Gemini and OpenAI API keys are stored separately and locally in this browser using `chrome.storage.local`.
- API keys are never saved in reply history and are never sent to the other provider.
- In-progress popup draft state, including the current generated reply, is stored locally so closing the popup does not lose your work.
- Optional local reply history is disabled by default. Basic history stores generated replies and basic metadata only.
- Detailed history can be explicitly enabled to store the original message/draft and optional context locally with the generated reply.
- API keys, raw API responses, page URLs, page titles, page content, and clipboard data are never saved in history.
- Norn Draft does not include analytics, tracking, ads, external scripts, continuous selection monitoring, or automatic page reading.

See [docs/PRIVACY.md](docs/PRIVACY.md) for more detail.

## Current limitations

- The right-click handoff does not support page-wide or site-aware context; only the text you selected is transferred.
- OpenAI and Gemini availability depends on the user's API key, project access, quota, and selected model.
- Local history is intentionally limited and does not sync across browsers.

## Low-Spec Readiness

- Norn Draft uses plain HTML, CSS, and JavaScript with no build framework or background processing loop.
- AI generation runs through the selected provider's API, not on the local device.
- Local work is limited to small popup/settings interactions, local storage reads/writes, and rendering capped history.
- Keeping reply history at 10 or 20 items helps preserve responsiveness on older PCs.

## Project Structure

- `manifest.json`
- `popup/`
- `options/`
- `docs/`
- `icons/`

## Icons

Extension icons are generated from `icons/norn-draft-updated.png` and wired into the manifest at 16, 32, 48, and 128 pixels.

## About

Norn Draft 1.8 is developed by Mark Dalmacio (`mjdaldev`). Contact: [mjdaldev@gmail.com](mailto:mjdaldev@gmail.com).

Norn Draft only processes content when you explicitly request a draft or rewrite. AI requests may be sent to the external provider you select.

## Release Checklist

- Manifest V3 is configured.
- Permissions are limited to `storage` and `contextMenus`, plus Gemini and OpenAI API host access.
- Popup and Options JavaScript syntax checks pass.
- Extension loads as an unpacked Chrome/Edge extension.
- No API keys or secrets are committed.

## Repository Purpose

This repository is a public showcase and release repository for Norn Draft.

Norn Draft is a privacy-focused browser extension for drafting and rewriting replies using user-provided AI API keys. Source code visibility may be limited depending on the release, but official documentation and release downloads are provided here.
