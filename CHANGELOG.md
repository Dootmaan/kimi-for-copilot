# Change Log

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-07-17

### Added

- Initial release of **Kimi Models for GitHub Copilot Chat**.
- **Dual API mode** support:
  - **Kimi Code membership** (`apiMode: "membership"`) — OAuth device-code login against `https://auth.kimi.com` (client ID `17e5f671-…`). No API key needed; shared quota with Kimi会员. Exposes the `kimi-for-coding` model via `https://api.kimi.com/coding/v1`.
  - **Standard API** (`apiMode: "standard"`) — BYOK API key on the Kimi Open Platform. Exposes `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, and `kimi-k2.5`.
- **Membership usage tracking** via `GET /coding/v1/usages`: weekly quota %, 5-hour rolling window %, and Booster (Extra Usage) wallet balance. Status bar turns red when quota hits 100%.
- **Balance tracking** (Standard API) via `GET /v1/users/me/balance`: available / voucher / cash balance. Status bar turns red when balance ≤ 0.
- OAuth token auto-refresh with leeway, persisted in VS Code SecretStorage.
- Visible step-by-step thinking streamed as Copilot Chat thinking parts (`reasoning_content`).
- Tool calling (up to 128 tools) for agentic workflows.
- International (`platform.kimi.ai` / `api.moonshot.ai`) and Mainland China (`platform.kimi.com` / `api.moonshot.cn`) regions for Standard API.
- Automatic retries with exponential backoff for HTTP 429 / 5xx responses.
- Per-request token-usage reporting to Copilot Chat.
