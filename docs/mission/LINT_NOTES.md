# Lint Notes

## ESLint Configuration

Fixed `.eslintrc.js`: removed invalid `prettier/@typescript-eslint` extend (removed in eslint-config-prettier v8+), added proper plugins/env/ignorePatterns.

### Rules enforced as errors
- `@typescript-eslint/no-unused-vars` — with `argsIgnorePattern: ^_`, `caughtErrorsIgnorePattern: ^_`
- `@typescript-eslint/no-explicit-any` — **warn** (not error)
- `no-console` — **warn**, allows `console.warn` and `console.error`

## Justified Exceptions

| File | Exception | Reason |
|------|-----------|--------|
| `src/modules/notification/firebase-admin.service.ts` | `eslint-disable-next-line @typescript-eslint/no-require-imports` | Firebase credential JSON loaded synchronously at startup via `require()`. Dynamic `import()` would require making `init()` async, breaking the constructor call chain. |

## Remaining Warnings (138)

All 138 remaining issues are **warnings** (MEDIUM/LOW severity):

- **`@typescript-eslint/no-explicit-any`** (~128 warnings): Pervasive use of `any` across controllers, services, and DTOs. Should be progressively replaced with proper types (`unknown` + narrowing, Prisma-generated types, or explicit interfaces).
- **`no-console`** (~10 warnings): `console.log` in production code (sms.service, vehicle.service, click.service, regex-classifier, main.ts). Should be replaced with NestJS `Logger`.

No `eslint-disable` comments were used for any of the 68 fixed errors.
