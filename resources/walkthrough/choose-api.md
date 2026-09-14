## Kimi Code Membership

Use this if you have a Kimi membership subscription. The extension uses OAuth device-code login (no API key needed). The endpoint is `api.kimi.com/coding/v1`. Quota is shared with your Kimi会员.

You can still set `kimi-copilot.apiMode` manually, but in normal use the extension switches back to **Kimi Code Membership** automatically after a successful OAuth login or a detected membership API key.

## Standard API

Pay-as-you-go access via the Kimi Open Platform. The endpoint depends on your region:

- **International** (`platform.kimi.ai`) — get your key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys)
- **Mainland China** (`platform.kimi.com`) — get your key at [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys)

You can still set `kimi-copilot.apiMode` and `kimi-copilot.region` manually, but after `Kimi: Set API Key` the extension tries to detect the correct Standard API region for you automatically.

> Keys from `platform.kimi.ai` and `platform.kimi.com` are independent — using a key from one platform on the other returns a 401 error.

## Automatic fallback

When Kimi Code membership quota is exhausted, the extension checks whether a saved Standard API key has positive balance. If it does, you get a confirmation prompt before the extension switches to Standard API and updates the region.

## Custom endpoint

Set `kimi-copilot.baseUrl` to override the endpoint entirely. Both `apiMode` and `region` are ignored when a base URL is set. Use this for self-hosted proxies or compatible OpenAI-style APIs.

Open settings to configure these options.