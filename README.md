# Kimi Models for GitHub Copilot Chat

Bring [Kimi](https://platform.kimi.ai/) (Moonshot AI) models — **kimi-k3**, **kimi-k2.7-code**, **kimi-k2.7-code-highspeed**, **kimi-k2.6**, and **kimi-k2.5** — directly into GitHub Copilot Chat, with visible step-by-step thinking and a built-in balance monitor. Bring-your-own-key (BYOK).

This extension is modeled after [`glm-for-copilot`](https://github.com/KiwiGaze/glm-for-copilot) and adapted for the Kimi (Moonshot AI) OpenAI-compatible API. Huge shout out to [@KiwiGaze](https://github.com/KiwiGaze) for his foundamental work and generious licensing.

## Features

- 🧩 **Seamless Copilot Chat integration** — Kimi models show up in the Copilot Chat model picker via the `LanguageModelChatProvider` API (vendor `kimi`).
- 🧠 **Visible thinking** — Kimi's `reasoning_content` streams as Copilot Chat thinking parts. `kimi-k3` / `kimi-k2.7-code` always reason; `kimi-k2.6` / `kimi-k2.5` are toggleable.
- 🛠️ **Tool calling** — full function/tool support (up to 128 tools) for agentic workflows.
- 💰 **Balance monitoring** — a status-bar item and detail panel show your available / voucher / cash balance via `GET /v1/users/me/balance`. The bar turns red when your balance is exhausted. *However, right now Kimi Code seems to be lacking the usage monitor API, so no usage tracking for Kimi Code is currently unavailable.*
- 🔐 **Secure key storage** — your API key lives in VS Code SecretStorage (OS keychain), never in `settings.json`.
- 🌏 **International + Mainland China** — `platform.kimi.ai` (`api.moonshot.ai`) and `platform.kimi.com` (`api.moonshot.cn`).
- 🔁 **Resilient streaming** — automatic retries with exponential backoff for HTTP 429 / 5xx.
- 📝 **Token usage reporting** — per-request usage (prompt / completion / total / cached) is forwarded to Copilot Chat.

## Quick start

1. Install the extension.
2. Create an API key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys) (International) or [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys) (Mainland China).
3. Run **`Kimi: Set API Key`** from the Command Palette and paste it.
4. Pick a Kimi model in the Copilot Chat model picker.

## Configuration

| Setting                                      | Default           | Description                                                                                                        |
| -------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `kimi-copilot.region`                      | `international` | `international` → `api.moonshot.ai`; `china` → `api.moonshot.cn`. Must match where your key was created. |
| `kimi-copilot.baseUrl`                     | `""`            | Override the API base URL. When set,`region` is ignored.                                                         |
| `kimi-copilot.maxTokens`                   | `0`             | Max output tokens (`0` = API default).                                                                           |
| `kimi-copilot.maxRetries`                  | `3`             | Auto-retries for transient failures (429 / 5xx).                                                                   |
| `kimi-copilot.thinking`                    | `enabled`       | Thinking toggle for`kimi-k2.6` / `kimi-k2.5`.                                                                  |
| `kimi-copilot.customModels`                | `[]`            | Add your own model ids to the picker.                                                                              |
| `kimi-copilot.modelIdOverrides`            | `{}`            | Remap built-in model ids for proxies.                                                                              |
| `kimi-copilot.showUsageStatusBar`          | `true`          | Show the balance status-bar item.                                                                                  |
| `kimi-copilot.usageRefreshIntervalMinutes` | `5`             | Status-bar refresh interval (1–1440 min).                                                                         |
| `kimi-copilot.debugLogging`                | `false`         | Verbose logging to the Kimi output channel.                                                                        |

## Commands

- `Kimi: Set API Key`
- `Kimi: Get API Key`
- `Kimi: Clear API Key`
- `Kimi: Refresh Usage`
- `Kimi: Show Usage Details`
- `Kimi: Open Settings`
- `Kimi: Show Logs`

## Development

```bash
pnpm install
pnpm run compile     # type-check + build to out/
pnpm test            # run vitest
pnpm run lint        # eslint
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with the extension loaded.

## License

MIT
