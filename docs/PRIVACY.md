# Norn Draft Privacy

Norn Draft V1.6 is designed to stay lightweight and explicit about what it uses.

## What the Extension Uses

- Text you type or paste into the popup
- Optional context/details you type into the popup
- Tone, provider, model, provider-specific API key, and reply length settings saved in this browser
- Optional local reply history if you enable it in Settings

## API Key Storage

Gemini and OpenAI API keys are stored separately and locally in this browser using `chrome.storage.local`. The selected provider's key is used only when you click **Generate Reply**.

Norn Draft does not hardcode API keys, commit secrets, or display your API key in popup status messages. API keys are never saved in reply history and are never sent to the other provider.

## Page Content

Norn Draft V1 does not read the current page, tabs, browsing history, cookies, or page content.

## Generated Replies

Generated replies are displayed in the popup so you can review and copy them. Norn Draft stores the current popup draft state locally so your in-progress work can be restored if the popup closes.

Local reply history is disabled by default and is stored locally only with `chrome.storage.local`.

Basic history stores generated reply text, provider, model, mode, selected tones, reply length, and timestamp.

Detailed history must be explicitly selected. When enabled, it stores the original message/draft and optional context/details locally with the generated reply and metadata.

Local history never stores API keys, raw API responses, page URLs, page titles, browser page content, or clipboard data. Basic history does not store original prompt text or optional context/details.

You can delete individual history items or clear all saved reply history from Settings. Clearing history does not remove your API keys or other settings.

## External Requests

When Gemini or OpenAI is selected and an API key is saved, Norn Draft sends the text you typed in the popup, selected tones, selected mode, optional context, and reply length guidance to the chosen AI provider only after you click **Generate Reply**.

Norn Draft only processes content when you explicitly request a draft or rewrite. AI requests may be sent to the external provider you select; processing is not represented as entirely local.

## No Tracking

Norn Draft V1 does not include analytics, tracking, ads, or external scripts.
