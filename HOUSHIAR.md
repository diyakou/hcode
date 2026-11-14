# Houshiar distribution

This checkout uses Houshiar as its only model provider. Users connect their own API key in the first-run dialog or with `/connect`. Credentials use the existing server credential store; they are not embedded in the application or sent to the renderer for gateway requests.

The gateway base URL is `https://api.houshiar-ai.ir/v1` (defined in `packages/schema/src/houshiar.ts`).

- `GET /v1/models` supplies the model picker. Full IDs, including prefixes such as `1hosh/`, are preserved.
- Claude model IDs use the Anthropic-compatible `/v1/messages` protocol. Other IDs use OpenAI-compatible `/v1/chat/completions`.
- `GET /v1/usage` validates the key and supplies account usage. This is the singular path registered by `E:\waiq\backend\app\routers\gateway.py`.
- Its `limits.max_context_tokens` and `limits.max_output_tokens` cap the discovered models, so automatic compaction and reply sizing respect the account's plan after model switches. Structured gateway context-limit rejections also trigger the existing overflow compaction recovery.
- `/usage` opens current account usage in the TUI and graphical app. The graphical app also has a usage button in provider settings.
- Other model providers are removed after configuration and external provider plugins run. MCP sign-ins remain available.
- Inventories refresh through the existing account-aware cache, including when the active API key changes. No model names are hardcoded.
- Houshiar retries model discovery every 30 seconds. The new-session screen keeps API connection and model reload actions available; reload forces discovery with the saved key without entering it again.

Use the Bun version pinned in `package.json` and install dependencies with `bun install --frozen-lockfile`.

To develop the customized backend and graphical app, run these in separate terminals:

```sh
bun dev serve --port 4096
bun --cwd packages/app dev -- --port 4444
```

Open `http://localhost:4444` and connect it to the customized backend on port 4096. A client connected to an existing upstream server uses that server's provider catalogue instead.

Run the gateway and provider contracts from `packages/core`:

```sh
bun run script/test.ts test/houshiar.test.ts test/plugin/provider-houshiar.test.ts
```

These tests use explicit HTTP fixtures and do not need a production API key. A live authenticated request against the gateway still needs to be checked using a user's key.
