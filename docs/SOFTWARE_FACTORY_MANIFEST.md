# Software Factory Manifest: wallet-dm

## Factory Overview

wallet-dm — a browser dapp for end-to-end-encrypted wallet-to-wallet messaging over the XMTP network, currently being migrated from `@xmtp/react-sdk` to `@xmtp/browser-sdk`. This factory runs a 6-agent sequential pipeline (Planner → Architect → Designer → Coder → Reviewer → Deployer) with two human gates. Tech stack: React 18 + TypeScript 5 + Vite 5 SPA, Tailwind CSS, Zustand state, wagmi/viem/web3modal wallet auth, no backend (direct XMTP network access), Vitest + Cypress testing, ESLint + Prettier, deployed on Vercel.

## Pipeline Sequence

1. **Planner**

   - Reads: feature request + PROJECT_MANIFEST.md
   - Writes: work-packages/wallet-dm.md

2. **Architect**

   - Reads: Planner work package + Tech Stack section of PROJECT_MANIFEST.md
   - Writes: docs/adr/NNNN-wallet-dm.md

3. **Designer**

   - Reads: Architect ADR + Domain Model section of PROJECT_MANIFEST.md
   - Writes: design/wallet-dm-spec.md

4. **Coder**

   - Reads: Designer spec + Conventions section of PROJECT_MANIFEST.md
   - Writes: src/ on feature branch wallet-dm-[feature]

5. **Reviewer**

   - Reads: code diff + Review Standards section of PROJECT_MANIFEST.md
   - Writes: review-reports/wallet-dm-review.md

6. **Deployer**
   - Reads: Reviewer report + Release Criteria section of PROJECT_MANIFEST.md
   - Writes: release-gates/wallet-dm-gate.md

## Human Gates

- **Gate 1 — After Architect:** Human approves ADR before Designer runs.
- **Gate 2 — After Reviewer:** Human approves review report before Deployer runs.

## Per-Agent System Prompt Seeds

**Planner:** "You are the Planner for wallet-dm. You decompose feature requests into work packages using the Domain Model (Client, Conversation, DecodedMessage) and Tech Stack in PROJECT_MANIFEST.md, honoring the migration-first constraint: `@xmtp/react-sdk` → `@xmtp/browser-sdk` before new features."

**Architect:** "You are the Architect for wallet-dm. You write architectural decision records using the Tech Stack and Constraints in PROJECT_MANIFEST.md, including how Client, Conversation, and message-cache concerns move from react-sdk/Dexie to browser-sdk's built-in local database."

**Designer:** "You are the Designer for wallet-dm. You write UX specs and interaction designs using the Domain Model (Conversation, DecodedMessage, wallet↔inboxId identity) and Conventions in PROJECT_MANIFEST.md, designing mobile-first for viewports down to 390px."

**Coder:** "You are the Coder for wallet-dm. You implement features following the Conventions and Task Inputs in PROJECT_MANIFEST.md, wiring Conversation and DecodedMessage flows through `@xmtp/browser-sdk` content codecs and never importing `@xmtp/react-sdk` in migrated paths."

**Reviewer:** "You are the Reviewer for wallet-dm. You enforce the Review Standards in PROJECT_MANIFEST.md against every code diff, verifying spec compliance, DecodedMessage content-codec handling, i18n coverage, and that no `@xmtp/react-sdk` or Dexie-cache access remains in migrated code."

**Deployer:** "You are the Deployer for wallet-dm. You gate releases against the Release Criteria in PROJECT_MANIFEST.md, confirming Conversation/DecodedMessage feature parity, green CI (typecheck, lint, Vitest, Cypress), and a successful Vercel preview deploy."

## Quality Gates

- **Stage 1 (Planner) passes when:** the work package names the concrete domain entities it touches (Client, Conversation, DecodedMessage), respects the migration-first constraint, and is scoped to a single feature branch.
- **Stage 2 (Architect) passes when:** the ADR addresses the Tech Stack and Constraints (browser-only runtime, mobile-first, web3-auth-only, migration-first), records the decision and alternatives, and a human approves it at Gate 1.
- **Stage 3 (Designer) passes when:** the spec covers all affected content types (text, reply, remote-attachment, screen-effect), specifies mobile behavior at ≤390px viewports, and routes all user-facing copy through i18next.
- **Stage 4 (Coder) passes when:** `npm run typecheck`, `npm run lint`, and `npm test` pass; code follows the Conventions (useX hooks, PascalCase component dirs, presentational/controller split); migrated paths contain no `@xmtp/react-sdk` imports or Dexie-cache access.
- **Stage 5 (Reviewer) passes when:** the review report shows no unresolved High-severity findings (data loss, security vulnerability, spec violation), all Medium findings are triaged, security rules are verified (no key material logged or persisted outside SDK storage, recipients validated via `canMessage`, attachments encrypted before upload), and a human approves the report at Gate 2.
- **Stage 6 (Deployer) passes when:** all seven Required release criteria PASS — typecheck, lint/format, Vitest, Cypress e2e, Vercel preview deploy, Gate 2 approval with no unresolved High findings, and the migration gate (no `@xmtp/react-sdk` imports in the shipped code path) — with bundle-size delta and Lighthouse mobile score reported as informational.

## Orchestrator Configuration

- Coordination pattern: sequential pipeline with handoffs
- Failure handling: stop pipeline at failing agent, surface error to human
- Retry policy: no automatic retries (human decides whether to re-run)
- Branch strategy: feature branch per work item, merge after Deployer gate passes

## Conventions Reference

- File naming: hooks `useCamelCase.ts(x)` in `src/hooks/`; components in PascalCase directories under `src/component-library/components/` with co-located Storybook stories; helpers camelCase
- Test files: `*.test.ts` under `src/helpers/tests/` (Vitest); e2e specs under `cypress/`
- API routes: none — no backend; all network I/O goes through the XMTP SDK and wagmi/viem
- Commits: Conventional Commits (`feat:`, `fix(lint):`, `chore(deps):` — observed in history)
- Branches: `<author>/<slug>` feature branches (e.g. `tomm/add-divvi-referral`), merged via PR into the main branch
