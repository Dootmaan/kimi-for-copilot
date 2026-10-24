# Change Log

All notable changes to this project will be documented in this file.

## [1.0.7] - 2026-10-24

### Added

- **K3.1 Pro series support** on both API modes, matching the October 23, 2026 launch.
  - **Kimi Code membership** now exposes `k3.1-pro` and `k3.1-pro-highspeed` (up to 1M context; the highspeed variant runs at ~2-3x speed).
  - **Standard API** now exposes `kimi-k3.1-pro` and `kimi-k3.1-pro-highspeed`.
  - Both are thinking-only models: the picker offers Low / High / Max effort (default High) and never sends a disable request, because the API rejects turning thinking off with HTTP 400.
  - Effort routes through top-level `reasoning_effort`, same as the K3 family.

### Changed

- Documented the official K2-series retirement timeline: K2 models stop being available to new Open Platform users on October 31, 2026, and the whole K2 series is scheduled to be retired by the end of December 2026. `kimi-k2.6` remains selectable until then and its description now carries the notice.

## [1.0.6] - 2026-10-15

### Changed

- Aligned the language model provider contribution with the latest Copilot Chat conventions: the Kimi entry in the model picker's provider list now exposes a manage-models action through `managementCommand`, opening the extension settings directly from Copilot Chat.
- Confirmed compatibility with VS Code 1.141 Copilot Chat model picker behavior, including the built-in Kimi branding for model rows and the provider tab.

## [1.0.5] - 2026-09-14

### Added

- Automatic API key detection when running `Kimi: Set API Key`.
  - The extension now probes Kimi Code membership plus both Open Platform regions after an API key is entered.
  - Membership keys switch the extension to **Kimi Code Membership** automatically.
  - Standard API keys switch the extension to **Standard API** automatically when no active membership credential exists, and auto-detect **International** vs **Mainland China**.
  - When Membership mode is already active through OAuth or a saved membership key, a detected Standard API key is kept as a fallback instead of forcing an immediate switch.
- Confirmed fallback from exhausted membership quota to Standard API.
  - When Kimi Code membership quota is exhausted, the extension now checks whether a saved Standard API key has positive balance.
  - If balance is available, it asks the user for confirmation before switching to Standard API and updating the region automatically.

### Changed

- Split stored credentials into separate membership and Standard API slots so OAuth-based membership and Standard API fallback can coexist.
- Updated README, walkthrough text, and settings descriptions to document automatic mode detection and fallback behavior.

## [1.0.4] - 2026-09-14

### Changed

- Refreshed the built-in model matrix to match the latest official Kimi product lineup.
  - **Kimi Code membership** now exposes `k3`, `k3-256k`, `kimi-for-coding` (K2.8 Preview under the same model ID), and `kimi-for-coding-highspeed`.
  - **Standard API** now exposes `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, and `kimi-k2.6`.
- Removed retired `kimi-k2.5` from the Standard API picker. Official Kimi Open Platform docs now mark it as retired and requests return `404`.
- Updated README, walkthrough copy, and in-product model descriptions to reflect the September 2026 lineup.

### Fixed

- Updated Kimi Code request routing to match the current model family semantics.
  - `k3`, `k3-256k`, and `kimi-for-coding` now use top-level `reasoning_effort` for `low` / `high` / `max`.
  - Turning thinking **Off** on those models now sends `thinking: { type: "disabled" }`, matching the documented K2.8 no-thinking route.
  - `kimi-for-coding-highspeed` stays always-on and is sent as preserved thinking without an effort selector.

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
