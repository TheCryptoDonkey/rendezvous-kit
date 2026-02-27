# Contributing to rendezvous-kit

Thanks for your interest in contributing! This document covers the workflow and conventions.

## Getting Started

```bash
git clone https://github.com/TheCryptoDonkey/rendezvous-kit.git
cd rendezvous-kit
npm install
npm test
```

## Development Workflow

1. **Branch from `main`** — create a feature branch for your work
2. **Write a failing test first** — we follow test-driven development (TDD)
3. **Implement the minimal code** to make the test pass
4. **Run the full suite** before committing: `npm test && npm run typecheck`
5. **Commit with conventional commits** — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) with semantic-release. Your commit message determines the version bump:

- `feat: add walking mode support` → minor version bump
- `fix: correct ORS distance units` → patch version bump
- `docs: update engine comparison table` → no version bump

## Code Conventions

- **British English** — favour, colour, behaviour, licence, initialise, metre
- **ESM-only** with `.js` extensions in imports (`import { foo } from './bar.js'`)
- **TypeScript strict mode** — no `any`, no implicit returns
- **GeoJSON coordinates** are `[longitude, latitude]` (GeoJSON standard)
- **Zero third-party dependencies** — don't add external runtime deps
- **JSDoc on all public exports** — every exported function, class, interface, and type

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run bench         # benchmarks
npm run typecheck     # type checking only
```

Tests use [Vitest](https://vitest.dev/). Place test files alongside source files as `*.test.ts` or in `tests/`.

## Pull Requests

- Keep PRs focused on a single change
- Include tests for new functionality
- Ensure `npm test && npm run typecheck` passes
- Reference any related issues

## Questions?

Open a [GitHub Issue](https://github.com/TheCryptoDonkey/rendezvous-kit/issues) — we're happy to help.
