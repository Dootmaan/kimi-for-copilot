Kimi Family for Github Copilot Chat uses your own Kimi credentials to make Kimi models available in the Copilot model picker.

**Kimi Code Membership mode**: Two sign-in options — run `Kimi: Set API Key` and choose:

1. **Sign in with browser (OAuth)** — opens a browser for the Kimi device-code login flow (recommended). Your token is stored in VS Code's SecretStorage.
2. **Paste an API key** — use a Kimi Code API key from [kimi.com/code/console](https://www.kimi.com/code/console). Also stored in SecretStorage.

**Standard API mode**: Your API key is stored in VS Code's SecretStorage (the OS keychain). It is never written to `settings.json` or your Git history.

Paste it once, then update or remove it later from the Command Palette.

- `Cmd/Ctrl + Shift + P`: Open the Command Palette
- `Kimi: Set API Key`: Set or update your credentials (OAuth login or API key, depending on `apiMode`)
- `Kimi: Clear API Key`: Remove your credentials
- `Kimi: Get API Key`: Open the key management page (Standard API mode only)
