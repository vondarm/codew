# AGENTS

## Scope

These instructions apply to the entire repository unless a more specific `AGENTS.md` overrides them.

## Tooling

- Use **Yarn** commands (the project is set up with Yarn Berry). Avoid `npm` or `pnpm`.
- Prefer repository scripts: `yarn lint`, `yarn test`, `yarn build`, etc.
- Run `yarn prisma:generate` after changing `prisma/schema.prisma` or any Prisma migration files.

## Code Style & Quality

- Respect the existing ESLint and Prettier configurations. Format touched files with `yarn format` or `yarn format:check`.
- Keep TypeScript strictness in mind; avoid using `any` unless justified with a comment.
- Co-locate component-specific styles and tests near their components when possible.

## Testing & Verification

- Execute relevant checks (`yarn lint`, `yarn test`, `yarn build`) before finishing significant work.
- Smoke test the app locally with `yarn dev` for UI-affecting changes.

## Documentation & Communication

- Prioritize guidance and standards documented under the `docs/` directory when making decisions.
- Update documentation in the `docs/` directory when workflows or assumptions change.
- Include concise but descriptive commit messages and PR summaries.

## Secrets & Configuration

- Do not commit secrets. Use `.env` based on `.env.example`; Prisma expects a valid `DATABASE_URL`.
- When database schema changes are required, prefer migrations via `yarn prisma migrate dev`.
