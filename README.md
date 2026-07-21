# Kimi Family for Github Copilot Chat

Bring [Kimi](https://platform.kimi.ai/) (Moonshot AI) models — **kimi-k3**, **kimi-k2.7-code**, **kimi-k2.7-code-highspeed**, **kimi-k2.6**, **kimi-k2.5**, and the **kimi-for-coding** membership model — directly into GitHub Copilot Chat, with visible step-by-step thinking and a built-in usage monitor. Supports both **Kimi Code membership** (OAuth) and **Standard API** (BYOK).


Install the Extension from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=Dootmaan.kimi-family-for-github-copilot-chat) or search `Kimi Family for Github Copilot Chat` in VSCode Extension Store.


This extension is modeled after [`glm-for-copilot`](https://github.com/KiwiGaze/glm-for-copilot) and adapted for the Kimi (Moonshot AI) OpenAI-compatible API. Huge shout out to [@KiwiGaze](https://github.com/KiwiGaze) for his foundamental work and generous licensing.

<img width="494" height="252" alt="image" src="https://github.com/user-attachments/assets/7b9a8a41-8450-4848-82a5-458e141b427f" />



## Features

- 🧩 **Seamless Copilot Chat integration** — Kimi models show up in the Copilot Chat model picker via the `LanguageModelChatProvider` API (vendor `kimi`).
- 🧠 **Visible thinking** — Kimi's `reasoning_content` streams as Copilot Chat thinking parts. `kimi-k3` / `kimi-k2.7-code` / `kimi-for-coding` always reason; `kimi-k2.6` / `kimi-k2.5` are toggleable.
- 🛠️ **Tool calling** — full function/tool support (up to 128 tools) for agentic workflows.
- 🏆 **Kimi Code membership support** — sign in via OAuth device-code login (browser) **or** paste a Kimi Code Console API key from [kimi.com/code/console](https://www.kimi.com/code/console). Shared quota with Kimi会员, tracked via the `/coding/v1/usages` endpoint (weekly quota %, 5-hour window, and Booster/Extra-Usage wallet).
- 💰 **Balance monitoring** — for the Standard API, a status-bar item and detail panel show your available / voucher / cash balance via `GET /v1/users/me/balance`. The bar turns red when exhausted.
- 🔐 **Secure credential storage** — OAuth tokens and API keys both live in VS Code SecretStorage (OS keychain), never in `settings.json`.
- 🌏 **International + Mainland China** — `platform.kimi.ai` (`api.moonshot.ai`) and `platform.kimi.com` (`api.moonshot.cn`) for Standard API; global `api.kimi.com` for membership.
- 🔁 **Resilient streaming** — automatic retries with exponential backoff for HTTP 429 / 5xx.
- 📝 **Token usage reporting** — per-request usage (prompt / completion / total / cached) is forwarded to Copilot Chat.

## Quick start

### Option A: Kimi Code membership (OAuth or API key)

1. Install the extension.
2. Set `kimi-copilot.apiMode` to **Kimi Code Membership**.
3. Run **`Kimi: Set API Key`** and choose:
   - **Sign in with browser (OAuth)** — opens a browser for the Kimi device-code login flow (recommended), **or**
   - **Paste an API key** — use a key from [kimi.com/code/console](https://www.kimi.com/code/console).
4. Pick the **kimi-for-coding** model in the Copilot Chat model picker.

### Option B: Standard API (pay-as-you-go)

1. Install the extension.
2. Set `kimi-copilot.apiMode` to **Standard API** and pick the matching `region`.
3. Create an API key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys) (International) or [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys) (Mainland China).
4. Run **`Kimi: Set API Key`** and paste it.
5. Pick a Kimi model (kimi-k3, kimi-k2.7-code, etc.) in the Copilot Chat model picker.

## Configuration

| Setting                                      | Default           | Description                                                                                                        |
| -------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `kimi-copilot.apiMode`                     | `membership`    | `membership` (Kimi Code OAuth) or `standard` (Kimi Open Platform API key). |
| `kimi-copilot.region`                      | `international` | `international` → `api.moonshot.ai`; `china` → `api.moonshot.cn`. Standard API only; must match where your key was created. |
| `kimi-copilot.baseUrl`                     | `""`            | Override the API base URL. When set, `apiMode` and `region` are ignored.                                                         |
| `kimi-copilot.maxTokens`                   | `0`             | Max output tokens (`0` = API default).                                                                           |
| `kimi-copilot.maxRetries`                  | `3`             | Auto-retries for transient failures (429 / 5xx).                                                                   |
| `kimi-copilot.thinking`                    | `enabled`       | Thinking toggle for `kimi-k2.6` / `kimi-k2.5`.                                                                  |
| `kimi-copilot.customModels`                | `[]`            | Add your own model ids to the picker.                                                                              |
| `kimi-copilot.modelIdOverrides`            | `{}`            | Remap built-in model ids for proxies.                                                                              |
| `kimi-copilot.showUsageStatusBar`          | `true`          | Show the usage status-bar item.                                                                                  |
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
