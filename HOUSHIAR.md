# Houshiar distribution

This checkout uses Houshiar as its only model provider. Users connect their own API key in the first-run dialog or with `/connect`. Credentials use the existing server credential store; they are not embedded in the application or sent to the renderer for gateway requests.

The gateway base URL is `https://api.houshiar-ai.ir/v1` (defined in `packages/schema/src/houshiar.ts`).

- `GET /v1/models` supplies the model picker. Full IDs, including prefixes such as `1hosh/`, are preserved.
- Every model defaults to the Anthropic-compatible `/v1/messages` protocol, including GPT and Auto. The backend translates model IDs as needed. Newly created backend conversations use `protocol: "anthropic"`.
- Primary model requests use backend memory. Each chat creates its own backend conversation with `POST /v1/conversations`; subagents and forks create independent conversations instead of inheriting the parent's ID. The app stores the remote ID in chat metadata with the owning local Session ID, never using a Session ID as a backend conversation ID.
- Before each call the app fetches `GET /v1/conversations/{id}`, sends the returned `revision` in `x-memory-revision`, and sends only the new user message for a text continuation. Tool continuations include the server’s own transcript followed by pending tool results, so tool-call and reasoning blocks match the stored history exactly. The first request for a new child or fork can seed its independent history. Requests sharing a backend conversation are serialized until their response streams finish.
- History/revision conflicts trigger one fetch and a rebuilt request using the server transcript. The identical failed payload is never blindly retried. A second conflict stops automatic retry. Auxiliary title, compaction, and generation calls stay stateless and cannot modify the chat's backend memory.
- **Account conversations** on the new-session screen lists the account's saved chats, previews their history, and restores a selected chat into a local Session with the same backend conversation ID. User messages, images, assistant text, and tool calls/results are restored without executing historical work.
- A restored legacy OpenAI conversation keeps `/v1/chat/completions` so its ID and history remain usable. Changing a model never changes an existing conversation’s protocol; new chats use Messages for every model.
- `GET /v1/usage` validates the key and supplies account usage. This is the singular path registered by `E:\waiq\backend\app\routers\gateway.py`.
- Its `limits.max_context_tokens` and `limits.max_output_tokens` cap the discovered models, so automatic compaction and reply sizing respect the account's plan after model switches. Structured gateway context-limit rejections also trigger the existing overflow compaction recovery.
- `/usage` opens current account usage in the TUI and graphical app. The graphical app also has a usage button in provider settings.
- Other model providers are removed after configuration and external provider plugins run. MCP sign-ins remain available.
- Inventories refresh through the existing account-aware cache, including when the active API key changes. No model names are hardcoded.
- Houshiar retries model discovery every 30 seconds. The new-session screen keeps API connection and model reload actions available; reload forces discovery with the saved key without entering it again.

### Auto selection

The picker lists only models returned by the gateway. When the gateway offers a model with ID `auto`, new sessions prefer it over recent models; explicit model selections and configured agent models still take precedence. Auto requests are sent to the gateway unchanged, and any routing is handled by the backend. If Auto is not offered, no local Auto model is added.

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
