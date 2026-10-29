# Copilot Chat agent harness — provider contract

How GitHub Copilot's agent mode (including subagent delegation) drives third-party
language-model providers such as this extension, and how each element is mapped onto the
Kimi Chat Completions wire format.

## What Copilot sends the provider

Copilot Chat calls `provideLanguageModelChatResponse` with:

| Element | Meaning |
| --- | --- |
| `options.tools` | The full agent toolset: built-in harness tools (file search, edits, terminal…), MCP tools, and **subagent delegation tools**. Subagents are not a special API — delegating to one is an ordinary tool call that Copilot executes, so any tool count/name arriving here must be honored. |
| `options.toolMode` | `LanguageModelChatToolMode.Auto` (default) or `.Required` — "The provider must implement respecting this." `Required` is used when the user explicitly pins a tool (e.g. `#tool:...`); the model must call one of the provided tools. |
| `messages` | Conversation history as `LanguageModelChatRequestMessage`s whose `content` is an array of parts: `TextPart`, `ToolCallPart` (assistant turn), `ToolResultPart` (following user turn), `DataPart` (images / structured data), and the proposed `ThinkingPart`. |
| `progress` | The provider streams back `LanguageModelTextPart`, `LanguageModelToolCallPart`, `LanguageModelThinkingPart`, and a `usage` `LanguageModelDataPart`. |

## Mapping to Kimi (implemented in this extension)

| Copilot element | Kimi wire | Where |
| --- | --- | --- |
| `LanguageModelChatTool` | `tools[].function` (`name`/`description`/`parameters`) | `convertTools` |
| `toolMode: Auto` | `tool_choice: "auto"` | `request.ts` |
| `toolMode: Required` | `tool_choice: "required"` **only on `kimi-k3`**; every other Kimi model rejects `required` with HTTP 400 and degrades to `"auto"` (see constraints) | `request.ts` |
| Assistant `ToolCallPart` history | `assistant.tool_calls[]` | `convertMessages` |
| `ToolResultPart` history | `role: "tool"` message keyed by `tool_call_id` | `convertMessages` |
| Streamed tool call | delta `tool_calls[]` → emitted as `LanguageModelToolCallPart` | `core.ts` / `stream.ts` |
| `ThinkingPart` history | `reasoning_content` (Preserved Thinking across tool-call turns) | `convertMessages` |

## Constraints and mitigations

1. **Tool-name charset.** Kimi function names must match `[a-zA-Z0-9_-]` and be ≤ 128
   chars. MCP/dynamic tool names may contain dots or other characters. The extension
   sanitizes names for the wire (`sanitizeToolName`) and keeps **bidirectional maps**
   (`wireNames` for history replay, `nameMap` to restore the original name on streamed
   tool calls) so Copilot always receives and replays the real tool/subagent names.
   Collisions after sanitization are de-duplicated with a numeric suffix.
2. **Toolset size.** The Kimi API documents `tools` `maxItems: 128`. The agent harness
   routinely sends larger toolsets (built-ins + MCP + subagent tools); when the request
   exceeds 128 the extension fails fast with a localized, actionable error instead of a
   raw HTTP 400 from the API.
3. **`Required` support is per model.** Kimi accepts `tool_choice: "required"` only on
   Open Platform `kimi-k3` (flagged `requiredToolChoice: true` in `src/consts.ts`). When
   Copilot pins a tool on any other model, the extension degrades to `tool_choice:
   "auto"` for that turn rather than failing the whole request — the harness loop stays
   intact, at the cost of the model being allowed to answer in text.
4. **Images in tool results.** Kimi tool messages are text-only. Image outputs of tools
   (e.g. subagent/browser screenshots) are replaced with a localized
   `[N image tool output omitted]` note so the model still knows an image existed.
5. **Mid-conversation tool-call insertion.** The Chat Completions API does not support
   inserting tool calls the model did not generate mid-history. Copilot's tool-call
   history replays are model-generated calls and map cleanly; harness-injected implicit
   calls may be reordered by this limitation.

## Subagent semantics

Delegation to subagents (Copilot spawning scoped child agents) surfaces to the provider as
regular entries in `options.tools`. No provider-side special-casing is required: Kimi
emits a normal tool call, the extension restores the original tool name and streams it to
Copilot, Copilot runs the subagent, and the result returns as a `ToolResultPart` in the
next turn's history — exactly the loop described above.
