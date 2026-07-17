# Change Log

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-07-17

### Added

- Initial release of **Kimi Models for GitHub Copilot Chat**.
- Brings `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, and `kimi-k2.5` into the Copilot Chat model picker via the `LanguageModelChatProvider` API.
- Visible step-by-step thinking streamed as Copilot Chat thinking parts (`reasoning_content`).
- Tool calling (up to 128 tools) for agentic workflows.
- Balance monitoring via `GET /v1/users/me/balance` with a status-bar item and detail panel (available / voucher / cash), turning red when the balance is exhausted.
- International (`platform.kimi.ai` / `api.moonshot.ai`) and Mainland China (`platform.kimi.com` / `api.moonshot.cn`) regions.
- Secure API-key storage in VS Code SecretStorage.
- Automatic retries with exponential backoff for HTTP 429 / 5xx responses.
- Per-request token-usage reporting to Copilot Chat.
