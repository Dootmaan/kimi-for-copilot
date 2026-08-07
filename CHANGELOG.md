# Change Log

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-08-07

### Fixed

- **Critical: requests failing on K2.5/K2.6 with "keep" field** — the `thinking` object was incorrectly sending `keep: "all"` for ALL K2.x models. Per the official API spec, only `kimi-k2.7-code` / `kimi-for-coding` require `keep: "all"`; `kimi-k2.6` and `kimi-k2.5` default to `keep: null` (no preservation) and reject the explicit field. This caused server-side 400 errors on K2.5/K2.6.
  - `kimi-k2.6` / `kimi-k2.5`: `thinking: { type: "enabled", effort: "low"|"high"|"max" }` (no `keep`).
  - `kimi-k2.7-code` / `kimi-for-coding`: `thinking: { type: "enabled", effort: "low"|"high"|"max", keep: "all" }`.
  - `kimi-k3`: top-level `reasoning_effort` (unchanged).

### Changed

- Confirmed the Kimi membership system has NOT been split yet — Kimi Code is still bundled with Kimi会员. The "新会员体系即将上线" banner remains a preview. No API changes needed.

## [1.0.2] - 2026-07-23

### Added

- **Thinking effort selector** — Low / High / Max effort levels in the model picker, replacing the old On/Off toggle. Confirmed against the official Kimi OpenAPI spec:
  - `kimi-k3`: sends top-level `reasoning_effort: "low"|"high"|"max"`.
  - `kimi-k2.6` / `kimi-k2.7-code` / `kimi-k2.5` / `kimi-for-coding`: sends `thinking: { type: "enabled", effort: "low"|"high"|"max", keep: "all" }`.
  - Toggleable models (`kimi-k2.6` / `kimi-k2.5`) also offer "Off" (`thinking: { type: "disabled" }`); always-on models omit it.

## [1.0.1] - 2026-07-21

### Added

- **`Kimi: OAuth Login` command** — a dedicated command for one-click OAuth device-code login, separate from `Kimi: Set API Key`.
- Walkthrough now guides users to choose between OAuth login and API key paste.
- OAuth token changes now refresh the model picker immediately.

## [1.0.0] - 2026-07-19

### Added

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

## [0.1.0] - 2026-07-17

### Added

- Initial release of **Kimi Family for Github Copilot Chat**.
- Brings Kimi models into the Copilot Chat model picker via the `LanguageModelChatProvider` API.
- Visible thinking (`reasoning_content`) streamed as Copilot Chat thinking parts.
- Standard API (BYOK) with balance monitoring.
- Tool calling, automatic retries, and token-usage reporting.
