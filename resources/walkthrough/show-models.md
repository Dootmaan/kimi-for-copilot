Your Kimi models appear in the Copilot Chat model picker as soon as the extension is active, filtered by your selected **API Mode**:

- **Kimi Code Membership** — `kimi-for-coding` (256K context, always reasons).
- **Standard API** — `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, and `kimi-k2.5`.

Until you run `Kimi: Set API Key`, the models appear with a reminder to set your credentials. If you do not see them right away, the model list may be long — scroll down and look for the Kimi models.

Thinking models stream their step-by-step reasoning as visible "thinking" parts:

- `kimi-k3`, `kimi-k2.7-code`, and `kimi-for-coding` always reason.
- `kimi-k2.6` and `kimi-k2.5` honor the `kimi-copilot.thinking` setting (on by default).

To add your own model ids, use the `kimi-copilot.customModels` setting.
