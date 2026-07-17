# Contributing

Thanks for your interest in improving **Kimi Models for GitHub Copilot Chat**!

## Development setup

```bash
pnpm install
pnpm run compile
pnpm test
```

Use the VS Code **Run Extension** launch configuration (<kbd>F5</kbd>) to open an Extension Development Host with the extension loaded.

## Before submitting a pull request

- `pnpm run lint` passes.
- `pnpm run typecheck` passes.
- `pnpm test` passes.
- Add tests for any new behavior.

## Commit messages

Use clear, concise commit messages in the imperative mood (e.g. "Add kimi-k3 to the model list").
