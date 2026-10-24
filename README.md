# Kimi Family for Github Copilot Chat

Bring the latest [Kimi](https://platform.kimi.ai/) (Moonshot AI) lineup directly into GitHub Copilot Chat, with visible step-by-step thinking and a built-in usage monitor. **Kimi Code membership** mode exposes **k3.1-pro**, **k3.1-pro-highspeed**, **k3**, **k3-256k**, **kimi-for-coding** (K2.8 Preview under the same ID), and **kimi-for-coding-highspeed**. **Standard API** mode exposes **kimi-k3.1-pro**, **kimi-k3.1-pro-highspeed**, **kimi-k3**, **kimi-k2.7-code**, **kimi-k2.7-code-highspeed**, and **kimi-k2.6**.


Install the Extension from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=Dootmaan.kimi-family-for-github-copilot-chat) or search `Kimi Family for Github Copilot Chat` in VSCode Extension Store.


This extension is modeled after [`glm-for-copilot`](https://github.com/Dootmaan/glm-for-copilot) and adapted for the Kimi (Moonshot AI) OpenAI-compatible API. Huge shout out to [@Dootmaan](https://github.com/KiwiGaze) for his foundamental work and generous licensing.

<img width="494" height="252" alt="image" src="https://github.com/user-attachments/assets/7b9a8a41-8450-4848-82a5-458e141b427f" />



## Features

- 🧩 **Seamless Copilot Chat integration** — Kimi models show up in the Copilot Chat model picker via the `LanguageModelChatProvider` API (vendor `kimi`).
- 🧠 **Visible thinking with effort control** — Kimi's `reasoning_content` streams as Copilot Chat thinking parts. The new **K3.1 Pro** family (`k3.1-pro`, `k3.1-pro-highspeed`, `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed`) is thinking-only with **Low / High / Max** effort (default High) — the API rejects turning thinking off, so the picker never offers it. Kimi Code `k3`, `k3-256k`, and `kimi-for-coding` expose the same effort levels and can route to a no-thinking backend when set to **Off**; `kimi-for-coding-highspeed` stays always-on. In Standard API mode, `kimi-k3` and the K2.7 code family always reason, while `kimi-k2.6` also offers **Off** (K2 series retires from the Open Platform at the end of December 2026).
- 🛠️ **Tool calling** — full function/tool support (up to 128 tools) for agentic workflows.
- 🏆 **Kimi Code membership support** — sign in via OAuth device-code login (browser) **or** paste a Kimi Code Console API key from [kimi.com/code/console](https://www.kimi.com/code/console). Shared quota with Kimi会员, tracked via the `/coding/v1/usages` endpoint (weekly quota %, 5-hour window, and Booster/Extra-Usage wallet).
- 🧭 **Automatic mode + region detection** — when you paste an API key, the extension checks Kimi Code membership plus both Open Platform regions and updates `apiMode` / `region` automatically when it can.
- 🔁 **Confirmed API fallback** — if Membership quota is exhausted and you already have a Standard API key with positive balance, the extension offers a one-click switch to Standard API after user confirmation.
- 💰 **Balance monitoring** — for the Standard API, a status-bar item and detail panel show your available / voucher / cash balance via `GET /v1/users/me/balance`. The bar turns red when exhausted.
- 🔐 **Secure credential storage** — OAuth tokens, membership API keys, and Standard API keys all live in VS Code SecretStorage (OS keychain), never in `settings.json`.
- 🌏 **International + Mainland China** — `platform.kimi.ai` (`api.moonshot.ai`) and `platform.kimi.com` (`api.moonshot.cn`) for Standard API; global `api.kimi.com` for membership.
- 🔁 **Resilient streaming** — automatic retries with exponential backoff for HTTP 429 / 5xx.
- 📝 **Token usage reporting** — per-request usage (prompt / completion / total / cached) is forwarded to Copilot Chat.

## Quick start

### Option A: Kimi Code membership (OAuth or API key)

1. Install the extension.
2. Run **`Kimi: OAuth Login`** for the cleanest membership flow, or run **`Kimi: Set API Key`** and choose:
   - **Sign in with browser (OAuth)** — opens a browser for the Kimi device-code login flow (recommended), **or**
   - **Paste an API key** — paste any Kimi key. Kimi Code keys stay in Membership mode; Open Platform keys are detected automatically.
4. Pick one of the Kimi Code membership models in the Copilot Chat model picker: **k3.1-pro**, **k3.1-pro-highspeed**, **k3**, **k3-256k**, **kimi-for-coding** (K2.8 Preview), or **kimi-for-coding-highspeed**.

### Option B: Standard API (pay-as-you-go)

1. Install the extension.
2. Create an API key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys) (International) or [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys) (Mainland China).
3. Run **`Kimi: Set API Key`** and paste it. The extension auto-detects whether the key belongs to the International or Mainland China platform and updates `region` for you.
5. Pick a Standard API model in the Copilot Chat model picker: **kimi-k3.1-pro**, **kimi-k3.1-pro-highspeed**, **kimi-k3**, **kimi-k2.7-code**, **kimi-k2.7-code-highspeed**, or **kimi-k2.6**.

## Automatic switching

- After **`Kimi: Set API Key`**, the extension probes Kimi Code membership plus both Standard API regions and stores the key in the correct credential slot automatically.
- If you are already signed into Membership mode through OAuth or a saved membership key, entering a Standard API key does **not** force an immediate mode switch. It is saved as a Standard API fallback instead.
- When membership quota is exhausted, the usage status bar checks whether a saved Standard API key has positive balance. If it does, the extension prompts you before switching to Standard API and setting the detected region.

## Configuration

| Setting                                      | Default           | Description                                                                                                        |
| -------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `kimi-copilot.apiMode`                     | `membership`    | Active access mode. Usually updated automatically after OAuth login or `Kimi: Set API Key`, but you can still override it manually. |
| `kimi-copilot.region`                      | `international` | `international` → `api.moonshot.ai`; `china` → `api.moonshot.cn`. Standard API only. Usually auto-detected after `Kimi: Set API Key`. |
| `kimi-copilot.baseUrl`                     | `""`            | Override the API base URL. When set, `apiMode` and `region` are ignored.                                                         |
| `kimi-copilot.maxTokens`                   | `0`             | Max output tokens (`0` = API default).                                                                           |
| `kimi-copilot.maxRetries`                  | `3`             | Auto-retries for transient failures (429 / 5xx).                                                                   |
| `kimi-copilot.thinking`                    | `enabled`       | Legacy compatibility setting. Built-in Kimi models now use the picker-side Thinking Effort control instead. |
| `kimi-copilot.customModels`                | `[]`            | Add your own model ids to the picker.                                                                              |
| `kimi-copilot.modelIdOverrides`            | `{}`            | Remap built-in model ids for proxies.                                                                              |
| `kimi-copilot.showUsageStatusBar`          | `true`          | Show the usage status-bar item. In Membership mode, this is also where quota-exhaustion fallback prompts appear. |
| `kimi-copilot.usageRefreshIntervalMinutes` | `5`             | Status-bar refresh interval (1–1440 min). Also controls how quickly exhausted membership quota can trigger a Standard API fallback prompt. |
| `kimi-copilot.debugLogging`                | `false`         | Verbose logging to the Kimi output channel.                                                                        |

## Commands

- `Kimi: Set API Key`
- `Kimi: OAuth Login`
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
