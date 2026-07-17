# Kimi (Moonshot AI) API — reference for kimi-for-copilot

This document summarizes the Kimi (Moonshot AI) API surface used by this extension. Source of truth: <https://platform.kimi.ai/docs>.

## Authentication

- Header: `Authorization: Bearer $MOONSHOT_API_KEY`
- The key is a server-side secret string (e.g. `sk-...`). Create one at:
  - International: <https://platform.kimi.ai/console/api-keys>
  - Mainland China: <https://platform.kimi.com/console/api-keys>
- Keys from `platform.kimi.ai` and `platform.kimi.com` are **independent** — using a key from one platform on the other returns `401`.

## Base URLs (by region)

| Region | Chat base URL | Balance host |
| --- | --- | --- |
| International (`platform.kimi.ai`) | `https://api.moonshot.ai/v1` | `https://api.moonshot.ai` |
| Mainland China (`platform.kimi.com`) | `https://api.moonshot.cn/v1` | `https://api.moonshot.cn` |

## Chat completions — `POST {baseUrl}/chat/completions`

OpenAI-compatible. The extension always streams (`stream: true`) with `stream_options: { include_usage: true }`.

### Models exposed

| Model | Context | Thinking control | Vision | Tool calling |
| --- | --- | --- | --- | --- |
| `kimi-k3` | 1M | top-level `reasoning_effort: "max"` (always reasons) | yes | auto / none / required |
| `kimi-k2.7-code` | 256K | `thinking: { type: "enabled", keep: "all" }` (always on) | yes | auto / none |
| `kimi-k2.7-code-highspeed` | 256K | same as `kimi-k2.7-code`, ~180 tokens/s | yes | auto / none |
| `kimi-k2.6` | 256K | `thinking: { type: "enabled" \| "disabled" }` | yes | auto / none |
| `kimi-k2.5` | 256K | `thinking: { type: "enabled" \| "disabled" }` | yes | auto / none |

### Streaming response shape

SSE, one JSON object per `data:` line, terminated by `data: [DONE]`.

```jsonc
{
  "choices": [{
    "delta": {
      "content": "Hello",
      "reasoning_content": "...thinking...",
      "tool_calls": [{ "index": 0, "id": "call_x", "function": { "name": "f", "arguments": "{}" } }]
    },
    "finish_reason": null
  }],
  "usage": { "prompt_tokens": 19, "completion_tokens": 13, "total_tokens": 32, "cached_tokens": 12 }
}
```

> Note: Kimi returns `cached_tokens` **flat** (not nested under `prompt_tokens_details`). This extension maps it into `prompt_tokens_details.cached_tokens` for Copilot Chat.

`finish_reason` is one of `stop`, `length`, `tool_calls`.

### Tools

- `tools` (maxItems **128**), each `{ type: "function", function: { name, description, parameters } }`.
- `tool_choice`: `auto` / `none` / `required` (`required` only on `kimi-k3`).
- Tool results are returned with `role: "tool"` + `tool_call_id`.

### Thinking

- For thinking models, the extension preserves prior `reasoning_content` on historical assistant messages (Kimi's "Preserved Thinking"), especially for `kimi-k2.7-code` which always keeps it.

## Balance — `GET {host}/v1/users/me/balance`

Returns available, voucher, and cash balances (unit: USD on the international platform).

```json
{
  "code": 0,
  "status": true,
  "data": {
    "available_balance": 49.58894,
    "voucher_balance": 46.58893,
    "cash_balance": 3.00001
  },
  "scode": "0x0"
}
```

- `code === 0` (or `status === true`) ⇒ success.
- When `available_balance <= 0`, inference calls return `exceeded_current_quota_error`; the status bar turns red.

## Error mapping (extension)

| HTTP | Status |
| --- | --- |
| 401 / 403 | `auth-error` (balance) |
| other 4xx/5xx | `server-error` (balance) / surfaced as chat error |
| network failure | `network-error` (balance) / categorized chat error |

Transient failures (`429`, `5xx`) are retried with exponential backoff honoring `Retry-After` / `retry-after-ms`.
