# Project Manifest: wallet-dm

## Overview

wallet-dm is a browser dapp for secure, end-to-end-encrypted wallet-to-wallet messaging over the XMTP network. End users connect their crypto wallet (via web3modal/WalletConnect), see their DM conversations, and send and receive messages with any other XMTP-reachable address — no accounts, no backend owned by this project. The codebase is a fork of xmtp-inbox-web (React + TypeScript). The first and primary goal is to migrate it from the deprecated `@xmtp/react-sdk` to the actively maintained `@xmtp/browser-sdk` (see https://docs.xmtp.org/chat-apps/intro/build-with-llms) while preserving all existing functionality. Target devices are mobile.

## Tech Stack

| Layer     | Technology                                                                          | Notes                                                                                       |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Frontend  | React 18.2 + TypeScript 5 + Vite 5                                                  | SPA, browser-only runtime; mobile-first                                                     |
| Styling   | Tailwind CSS 3.4                                                                    | + @tailwindcss/forms, @headlessui/react, @heroicons/react                                   |
| State     | Zustand 4 (`src/store/xmtp.tsx`)                                                    | Dexie 3 local cache belongs to react-sdk era — removed by the migration                     |
| Routing   | react-router-dom 6                                                                  | Routes: index (connect) → inbox → dm                                                        |
| Messaging | `@xmtp/react-sdk` v6 → **migrating to** `@xmtp/browser-sdk`                         | Content types: text, reply, remote-attachment, screen-effect                                |
| Web3 auth | wagmi 1 + viem 1 + @web3modal/wagmi 3                                               | Wallet connection is the only identity/auth                                                 |
| Backend   | None                                                                                | Client talks directly to the XMTP network                                                   |
| Database  | None server-side                                                                    | Local message cache: Dexie (current) → browser-sdk built-in local DB (OPFS) after migration |
| Storage   | web3.storage / @web3-storage/w3up-client                                            | Encrypted remote attachments                                                                |
| i18n      | i18next + react-i18next                                                             | Translations in `src/locales/`                                                              |
| Testing   | Vitest 1 + happy-dom (unit); Cypress 13 (e2e); Storybook                            | CI: `.github/workflows/checks.yml`, `e2e-tests.yml`                                         |
| Linting   | ESLint 8 (@typescript-eslint 7, react, react-hooks, jsx-a11y, cypress) + Prettier 3 | `npm run lint`, `npm run format:check`, `npm run typecheck`                                 |
| Deploy    | Vercel (`vercel.json`)                                                              | Preview deploys per PR                                                                      |

## Project Structure

```
xmtp-dapp/
├── src/
│   ├── component-library/     # Presentational components (PascalCase dirs) + page layouts + Storybook stories
│   │   ├── components/        #   AddressInput, ConversationList, Avatar, FullConversation, …
│   │   └── pages/             #   Page-level layout components
│   ├── controllers/           # Container components wiring hooks/store to component-library
│   ├── hooks/                 # useInitXmtpClient, useListConversations, useSendMessage, useStreamAllMessages, …
│   ├── helpers/               # Utilities (+ classes/, tests/)
│   ├── pages/                 # Route pages: index.tsx (connect), inbox.tsx, dm.tsx
│   ├── store/                 # Zustand store (xmtp.tsx)
│   ├── locales/               # i18next translation JSON
│   ├── main.tsx               # Entry: wagmi/web3modal providers, router
│   └── polyfills.ts
├── cypress/                   # E2E tests
├── patches/                   # patch-package patches (applied on postinstall)
├── public/
├── docs/                      # Factory docs (this manifest, PROJECT_OVERVIEW.md)
└── .github/workflows/         # checks.yml, e2e-tests.yml
```

## Domain Model

Documented as **current model + target model + migration mapping**, because the react-sdk → browser-sdk migration changes the core entities.

### Current (`@xmtp/react-sdk` v6, Dexie-cached)

- **CachedConversation**: `topic` (unique id), `peerAddress` (0x…), `walletAddress` (owner), `createdAt`, `updatedAt`
- **CachedMessage**: `id`/`xmtpID`, `conversationTopic`, `senderAddress`, `walletAddress`, `content`, `contentType` (text \| reply \| remote-attachment \| screen-effect), `sentAt`, `status`
- **Identity**: the connected wallet address via wagmi; recipients entered by address or ENS name

### Target (`@xmtp/browser-sdk`)

- **Client**: `inboxId`, `installationId`, `env` (dev \| production); created from a wallet signer signature
- **Identity/Inbox**: wallet address (0x…) ↔ `inboxId`; one inbox can have multiple installations
- **Conversation (Dm)**: `id`, `peerInboxId`, `createdAt`; obtained via `list()` / `stream()`
- **DecodedMessage**: `id`, `conversationId`, `senderInboxId`, `content` (via content codecs: text, reply, remote-attachment, screen-effect), `sentAt`
- **Attachment**: encrypted remote attachment, uploaded to web3.storage

### Migration mapping

| Current (react-sdk)                            | Target (browser-sdk)                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `topic`                                        | `conversation.id`                                                                        |
| `peerAddress`                                  | `peerInboxId` (requires address↔inboxId resolution, e.g. `canMessage` / inboxId lookup) |
| `senderAddress`                                | `senderInboxId`                                                                          |
| `CachedConversation` / `CachedMessage` (Dexie) | browser-sdk's built-in local database (OPFS) — the Dexie layer is removed                |

Relationships: Client 1—N Conversation; Conversation 1—N DecodedMessage; wallet Identity 1—1 inboxId 1—N installations.

## Conventions

- File naming: hooks `useCamelCase.ts(x)` in `src/hooks/`; components in PascalCase directories under `src/component-library/components/` with co-located Storybook stories; helpers camelCase
- Test files: `*.test.ts` under `src/helpers/tests/` (Vitest); e2e specs under `cypress/`
- API routes: none — no backend; all network I/O goes through the XMTP SDK and wagmi/viem
- Commits: Conventional Commits (`feat:`, `fix(lint):`, `chore(deps):` — observed in history)
- Branches: `<author>/<slug>` feature branches (e.g. `tomm/add-divvi-referral`), merged via PR into the main branch

## Constraints

- **Migration first**: move from `@xmtp/react-sdk` to `@xmtp/browser-sdk` before any new features; preserving existing functionality is paramount
- Group chats are out of scope for the migration (nice-to-have afterwards)
- Browser-only runtime; this project owns no backend services
- Mobile-first: target devices are mobile
- Web3 auth only (wallet connection) — no email/password or external auth providers
- No observability requirements (Datadog RUM dependency exists but is N/A per the brief)
- Use the XMTP LLM-oriented docs when working with the SDK: https://docs.xmtp.org/chat-apps/intro/build-with-llms

---

## Task Inputs

_(pipeline-critical — verify before running factory)_

| Agent     | Receives                                                      | From                              |
| --------- | ------------------------------------------------------------- | --------------------------------- |
| Planner   | Feature request + PROJECT_MANIFEST.md                         | Human / backlog (GitHub Issues)   |
| Architect | work-packages/wallet-dm.md + Tech Stack section               | Planner                           |
| Designer  | docs/adr/NNNN-wallet-dm.md + Domain Model section             | Architect (after Gate 1 approval) |
| Coder     | design/wallet-dm-spec.md + Conventions section                | Designer                          |
| Reviewer  | Code diff on feature branch + Review Standards section        | Coder                             |
| Deployer  | review-reports/wallet-dm-review.md + Release Criteria section | Reviewer (after Gate 2 approval)  |

## Services to Connect

| Service                      | Purpose                             | Config                                |
| ---------------------------- | ----------------------------------- | ------------------------------------- |
| GitHub (wallet-dm/xmtp-dapp) | Source control + PRs                | Already set up                        |
| GitHub Issues                | Issue tracking                      | Already set up                        |
| GitHub Actions               | CI (checks.yml, e2e-tests.yml)      | Already set up                        |
| Vercel                       | Hosting + preview deploys           | Already set up (`vercel.json`)        |
| Discord                      | Comms                               | https://discord.gg/6MAWksNwn          |
| XMTP network                 | Messaging transport                 | `env: dev \| production` via env vars |
| WalletConnect / web3modal    | Wallet connection (auth)            | Project ID env var                    |
| web3.storage                 | Encrypted remote attachment storage | API token env var                     |

## Success Criteria

### Per-Feature Success (migration parity — full checklist)

- [ ] Connect wallet via web3modal/WalletConnect and initialize an XMTP browser-sdk client
- [ ] List existing DM conversations
- [ ] Send and receive text messages in real time (streaming)
- [ ] Replies, remote attachments, voice messages, and screen effects all functional
- [ ] Message history preserved across the migration
- [ ] Usable on mobile viewports (≤390px)

### Factory-Level Success

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and Cypress e2e all pass in CI on a clean checkout
- [ ] Vercel preview deploy succeeds for every PR
- [ ] No remaining `@xmtp/react-sdk` imports after the migration completes

---

## Review Standards

_(default — customize for this project)_

### Spec Compliance

- Implementation matches the Designer spec; deviations must be called out in the PR
- Migrated code paths must not import `@xmtp/react-sdk` or reach into the Dexie cache
- All four content types (text, reply, remote-attachment, screen-effect) remain wired through content codecs
- User-facing strings go through i18next — no hard-coded copy

### Style

- TypeScript passes `tsc` with no errors; no `any` escapes without justification
- ESLint + Prettier clean (`npm run lint`, `npm run format:check`)
- Hooks follow the `useX` convention and rules-of-hooks; components stay presentational in component-library, wiring lives in controllers
- Mobile-first: new UI verified at small viewports

### Security

- Never log, persist, or transmit private keys, signatures, or XMTP key bundles outside SDK-sanctioned storage
- Validate recipient addresses/inboxIds (`canMessage`) before creating conversations or sending
- Attachments are encrypted before upload to web3.storage
- No secrets in the repo — env vars only

### Severity Scale

- **Low**: cosmetic issues, minor inconsistencies
- **Medium**: functional gaps, missing edge cases
- **High**: data loss, security vulnerability, spec violation

---

## Release Criteria

_(default — customize for this project)_

### Required (all must PASS)

1. [ ] `npm run typecheck` passes
2. [ ] `npm run lint` and `npm run format:check` pass
3. [ ] `npm test` (Vitest) passes
4. [ ] Cypress e2e suite passes in CI
5. [ ] Vercel preview deploy succeeds
6. [ ] Reviewer report approved at Gate 2 with no unresolved High-severity findings
7. [ ] Migration gate: no `@xmtp/react-sdk` imports in the shipped code path

### Informational (reported but non-blocking)

- Bundle size delta vs. previous release
- Lighthouse mobile performance score
