## Kimi Code Membership

Use this if you have a Kimi membership subscription. The extension uses OAuth device-code login (no API key needed). The endpoint is `api.kimi.com/coding/v1`. Quota is shared with your Kimi会员.

Set `kimi-copilot.apiMode` to **Kimi Code Membership** in settings, then run `Kimi: Set API Key` to authorize via the device-code flow.

## Standard API

Pay-as-you-go access via the Kimi Open Platform. The endpoint depends on your region:

- **International** (`platform.kimi.ai`) — get your key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys)
- **Mainland China** (`platform.kimi.com`) — get your key at [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys)

Set `kimi-copilot.apiMode` to **Standard API** and pick the matching `kimi-copilot.region`.

> Keys from `platform.kimi.ai` and `platform.kimi.com` are independent — using a key from one platform on the other returns a 401 error.

## Custom endpoint

Set `kimi-copilot.baseUrl` to override the endpoint entirely. Both `apiMode` and `region` are ignored when a base URL is set. Use this for self-hosted proxies or compatible OpenAI-style APIs.

Open settings to configure these options.