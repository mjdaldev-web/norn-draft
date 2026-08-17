# Norn Draft Privacy

Norn Draft V2.0 is designed to stay lightweight and explicit about what it uses.

## What the Extension Uses

- Text you type or paste into the Norn Draft workspace (quick popup, extension window, or side panel)
- Optional context/details you type into the popup
- Tone, provider, model, provider-specific API key, and reply length settings saved in this browser
- Custom tone presets you create, including their names and style instructions, saved locally in this browser
- Highlighted webpage text only after you explicitly choose **Open selection in Norn Draft** from the browser context menu
- Optional local reply history if you enable it in Settings

## API Key Storage

Gemini and OpenAI API keys are stored separately and locally in this browser using `chrome.storage.local`. The selected provider's key is used only when you click **Generate Reply**.

Norn Draft does not hardcode API keys, commit secrets, or display your API key in popup status messages. API keys are never saved in reply history and are never sent to the other provider.

## Page Content

Norn Draft can remain open in a browser side panel, but does not monitor selections, read surrounding page content, inspect tabs, browsing history, cookies, or page HTML. The context-menu action receives only the browser-provided selected text after you explicitly invoke it.

Selected text is stored in a short-lived local handoff record while Norn Draft opens. It is removed after the workspace resolves insertion and is never stored in cloud or sync storage.

## Generated Replies

Generated replies are displayed in the workspace so you can review and copy them. Norn Draft stores the current workspace draft state locally so in-progress work can be restored if the popup closes or the side panel is hidden.

Local reply history is disabled by default and is stored locally only with `chrome.storage.local`.

Basic history stores generated reply text, provider, model, mode, selected tones, reply length, and timestamp.

Detailed history must be explicitly selected. When enabled, it stores the original message/draft and optional context/details locally with the generated reply and metadata.

Local history never stores API keys, raw API responses, page URLs, page titles, browser page content, or clipboard data. Basic history does not store original prompt text or optional context/details.

You can delete individual history items or clear all saved reply history from Settings. Clearing history does not remove your API keys or other settings.

## External Requests

When Gemini or OpenAI is selected and an API key is saved, Norn Draft sends the text you reviewed in the popup, selected tones or custom preset guidance, selected mode, optional context, and reply length guidance to the chosen AI provider only after you click **Generate Reply**. Message/draft and context character limits are checked before the request is sent. If you explicitly click **Refresh available models** in Settings, Norn Draft also sends only the selected provider's API key to that provider's model-list endpoint; the returned filtered model list is cached locally for 24 hours with a one-hour refresh cooldown.

Norn Draft only processes content when you explicitly request a draft or rewrite. AI requests may be sent to the external provider you select; processing is not represented as entirely local.

## No Tracking

Norn Draft V2.0 does not include analytics, tracking, ads, external scripts, cloud sync, or automatic webpage reading.
