## International (platform.kimi.ai)

Use this if your API key was created on `platform.kimi.ai`. The endpoint is `api.moonshot.ai/v1`. Get your key at [platform.kimi.ai/console/api-keys](https://platform.kimi.ai/console/api-keys).

Set `kimi-copilot.region` to **International** in settings.

## Mainland China (platform.kimi.com)

Use this if your API key was created on `platform.kimi.com`. The endpoint is `api.moonshot.cn/v1`. Get your key at [platform.kimi.com/console/api-keys](https://platform.kimi.com/console/api-keys).

Set `kimi-copilot.region` to **Mainland China** in settings.

> Keys from `platform.kimi.ai` and `platform.kimi.com` are independent — using a key from one platform on the other returns a 401 error. Pick the region that matches where your key was created.

## Custom endpoint

Set `kimi-copilot.baseUrl` to override the endpoint entirely. `region` is ignored when a base URL is set. Use this for self-hosted proxies or compatible OpenAI-style APIs.

Open settings to configure these options.
