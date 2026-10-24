Your Kimi models appear in the Copilot Chat model picker as soon as the extension is active, filtered by your selected **API Mode**:

- **Kimi Code Membership** — `k3.1-pro`, `k3.1-pro-highspeed`, `k3`, `k3-256k`, `kimi-for-coding` (K2.8 Preview under the same ID), and `kimi-for-coding-highspeed`.
- **Standard API** — `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed`, `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, and `kimi-k2.6`.

Until you run `Kimi: Set API Key`, the models appear with a reminder to set your credentials. If you do not see them right away, the model list may be long — scroll down and look for the Kimi models.

Thinking models stream their step-by-step reasoning as visible "thinking" parts:

- `k3.1-pro`, `k3.1-pro-highspeed`, `kimi-k3.1-pro`, and `kimi-k3.1-pro-highspeed` are thinking-only: Low / High / Max effort (default High), no Off.
- `k3`, `k3-256k`, and `kimi-for-coding` support Low / High / Max effort and can route to a no-thinking backend when set to Off.
- `kimi-for-coding-highspeed`, `kimi-k3`, `kimi-k2.7-code`, and `kimi-k2.7-code-highspeed` always reason.
- `kimi-k2.6` can be turned Off from the picker (the K2 series retires from the Open Platform at the end of December 2026).

To add your own model ids, use the `kimi-copilot.customModels` setting.
