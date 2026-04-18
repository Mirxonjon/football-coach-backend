# Security Review — Phase 1.3 Migration Safety

**Reviewer:** Vault (DevSecOps)
**Date:** 2026-04-19
**Scope:** `prisma/schema.prisma` + auth service layer PII handling

---

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | CRITICAL | OTP codes stored in plaintext in DB | BLOCKS MERGE |
| 2 | CRITICAL | OTP code leaked in API response | BLOCKS MERGE |
| 3 | CRITICAL | Hardcoded test phone/OTP in production code | BLOCKS MERGE |
| 4 | MEDIUM  | Missing `@@index([userId])` on `UserDevice` | WARNING |
| 5 | OK      | All FK columns have `@@index` | PASS |
| 6 | OK      | Cascade rules are safe | PASS |
| 7 | OK      | password, refreshToken, registrationToken, resetToken all bcrypt-hashed | PASS |

---

## CRITICAL Findings (block merge)

### 1. OTP codes stored in plaintext

**File:** `src/modules/auth/otp.service.ts:40-42`

The `OtpCode.code` field is written as a raw string. Any DB read (backup, SQL injection, insider) exposes all active OTP codes. The schema comment says `// hashed` for tokens but `OtpCode.code` has no such annotation.

**Required fix:** Hash OTP with bcrypt (or SHA-256 + constant-time compare since OTPs are short-lived) before persisting. Compare using `bcrypt.compare()` on verification.

### 2. OTP code returned in API response

**File:** `src/modules/auth/auth.service.ts:121`

```typescript
return { message: 'OTP sent', code };
```

The `requestLoginOtp` method returns the raw OTP code in the HTTP response body. This defeats the purpose of OTP entirely — any client can read the code without access to the phone.

**Required fix:** Remove `code` from the response. Return only `{ message: 'OTP sent' }`. If needed for dev/staging, gate behind `NODE_ENV !== 'production'`.

### 3. Hardcoded test phone + OTP

**File:** `src/modules/auth/otp.service.ts:32-33`

```typescript
if (phone === '+998987654321') {
  code = '12345';
}
```

A well-known test number with a static OTP is an open backdoor in production. Attackers can authenticate as any user who registers with this phone number.

**Required fix:** Gate behind `NODE_ENV !== 'production'` or remove entirely. Use environment variable for test numbers if needed in staging.

---

## MEDIUM Findings (warning only, no code change)

### 4. Missing index on `UserDevice.userId`

**File:** `prisma/schema.prisma:425` — `UserDevice` model

The `userId` FK has no `@@index([userId])`. Queries filtering devices by user will table-scan.

**Recommended:** Add `@@index([userId])` to `UserDevice`.

---

## PASS Items

### 5. FK index coverage

All other FK columns have corresponding `@@index` directives:
- `OtpCode`: `@@index([phone])`, `@@index([userId])`
- `RegistrationToken`, `PasswordResetToken`, `Session`: `@@index([userId])`
- `Car`: `@@index([createdById])`
- `UserCar`: `@@index([userId])`, `@@index([carId])`
- `FuelStation`: `@@index([operatorId])`
- `FuelPump`: `@@index([stationId])`
- `FuelPumpStatusLog`: `@@index([fuelPumpId])`
- `FuelPumpFuel`: `@@index([fuelPumpId])`, `@@index([fuelTypeId])`
- `FuelSession`: all five FK columns indexed
- `PaymentTransaction`: `@@index([userId])`, `@@index([cardId])`
- `OperatorPayout`: `@@index([operatorId])`
- `Card`: `@@index([userId])`
- `TelegramSetting`: `@@index([userId])`
- `Notification`: `@@index([userId])`
- `FuelStationLike`: `@@index([userId])`, `@@index([fuelStationId])`
- `LegalTranslation`: `@@index([language])` (FK covered by `@@unique`)

### 6. Cascade rules

Only one explicit cascade exists: `LegalTranslation → LegalDocument (onDelete: Cascade)` — correct, translations are owned content.

All other relations use Prisma's default behavior (error on delete if referenced), which means:
- Deleting a `User` with active sessions/cards/etc. will fail — **correct**, prevents accidental data loss.
- `PaymentTransaction` has no cascade from any parent — **correct**, historical financial records preserved.
- `FuelSession` has no cascade — **correct**.

### 7. PII hashing

| Field | Storage | Verified |
|-------|---------|----------|
| `User.password` | bcrypt (cost 12) | `auth.service.ts:286,320,469,490,521` |
| `Session.refreshToken` | bcrypt (cost 10) | `auth.service.ts:360` |
| `RegistrationToken.token` | bcrypt (cost 12) | `auth.service.ts:253` |
| `PasswordResetToken.token` | bcrypt (cost 12) | implied by compare at `:311` |

---

## Merge Decision

**BLOCKED.** Three CRITICAL findings must be resolved before Phase 1.2 schema rewrite can merge. Findings 1-3 are pre-existing vulnerabilities in the auth layer but must not carry forward into the rewritten schema without remediation.
