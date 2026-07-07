# Norn Draft Agent Instructions

## Project Overview
Norn Draft is a lightweight Manifest V3 browser extension for Chrome and Microsoft Edge. It helps users draft polished AI-generated replies with tone presets and their own AI API key.

## Tech Stack
- Plain HTML, CSS, and JavaScript for V1
- Manifest V3
- Chrome and Microsoft Edge first
- No React, Vite, TypeScript, or build tools in V1

## Folder Structure
- `manifest.json` for the extension manifest
- `popup/` for the popup UI
- `options/` for settings and preferences
- `icons/` for extension icons
- `docs/` for project documentation

## V1 Scope
- Keep the extension simple and loadable as an unpacked extension
- Keep permissions minimal
- Do not add AI/API integration in this patch
- Do not read current page content in V1

## UI Guidelines
- Use clear, restrained layouts
- Prefer plain controls and simple copy
- Keep popup and options UI lightweight and accessible
- Avoid unnecessary complexity or visual flourish

## Privacy and Security Rules
- Do not commit secrets, tokens, or API keys
- Do not log sensitive data
- Use `chrome.storage.local` for user settings later
- Keep permissions narrow and justified
- Do not add page-reading or content-capture features in V1

## Development Rules
- Preserve the plain HTML/CSS/JavaScript approach for V1
- Keep changes scoped to the requested files
- Avoid unrelated refactors
- Favor small, reviewable patches

## Git Rules
- Commit after each completed patch
- Use focused commit messages that describe the change
- Keep the working tree clean after each task
