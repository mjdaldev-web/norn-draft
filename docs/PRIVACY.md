# Norn Draft Privacy

Norn Draft V1 is designed to stay lightweight and explicit about what it uses.

## What the Extension Uses

- Text you type or paste into the popup
- Optional context/details you type into the popup
- Tone, provider, API key, and reply length settings saved in this browser

## API Key Storage

Your API key is stored locally in this browser using `chrome.storage.local`. It is used only when you click **Generate Reply**.

Norn Draft does not hardcode API keys, commit secrets, or display your API key in popup status messages.

## Page Content

Norn Draft V1 does not read the current page, tabs, browsing history, cookies, or page content.

## Generated Replies

Generated replies are displayed in the popup so you can review and copy them. Norn Draft V1.1 stores only the current popup draft state locally so your in-progress work can be restored if the popup closes.

Norn Draft does not store a generated-reply history list.

## External Requests

When Gemini is selected and an API key is saved, Norn Draft sends the text you typed in the popup, selected tones, selected mode, optional context, and reply length guidance to the Gemini API.

## No Tracking

Norn Draft V1 does not include analytics, tracking, ads, or external scripts.
