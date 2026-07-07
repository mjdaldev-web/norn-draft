# Norn Draft Privacy

Norn Draft V1.4 is designed to stay lightweight and explicit about what it uses.

## What the Extension Uses

- Text you type or paste into the popup
- Optional context/details you type into the popup
- Tone, provider, model, API key, and reply length settings saved in this browser
- Optional local reply history if you enable it in Settings

## API Key Storage

Your API key is stored locally in this browser using `chrome.storage.local`. It is used only when you click **Generate Reply**.

Norn Draft does not hardcode API keys, commit secrets, or display your API key in popup status messages.

## Page Content

Norn Draft V1 does not read the current page, tabs, browsing history, cookies, or page content.

## Generated Replies

Generated replies are displayed in the popup so you can review and copy them. Norn Draft stores the current popup draft state locally so your in-progress work can be restored if the popup closes.

Local reply history is disabled by default. If you enable it, Norn Draft stores only generated reply text, provider, model, mode, selected tones, reply length, and timestamp in `chrome.storage.local`.

Local history does not store API keys, original prompt text, optional context/details, raw API responses, page URLs, page titles, browser page content, or clipboard data.

## External Requests

When Gemini or OpenAI is selected and an API key is saved, Norn Draft sends the text you typed in the popup, selected tones, selected mode, optional context, and reply length guidance to the chosen AI provider only after you click **Generate Reply**.

## No Tracking

Norn Draft V1 does not include analytics, tracking, ads, or external scripts.
