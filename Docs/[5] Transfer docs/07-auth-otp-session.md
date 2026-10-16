# 07 — Auth, OTP & Session Policy

## Goals

Unified authentication for all roles with:
- Client self-registration
- Login rate limiting / progressive lockout
- Optional admin OTP (redesign required)
- Password reset via email codes
- Idle session timeout + remember-me

## Registration

| Rule | Value |
|------|-------|
| Who can register publicly | Clients only |
| Required | name, email, password (min 8, confirmed), terms accepted |
| Defaults | `role=client`, `is_active=true`, `email_verified=true` (current behavior) |
| Other roles | Created by Admin only |

## Login

1. Validate email + password.
2. If user inactive → reject; record failed attempt.
3. If credentials invalid → record failed attempt; apply lockout.
4. If OTP required for this user → create verification; redirect to OTP screen (do **not** fully log in yet).
5. Else → establish session; update `last_login_at`.

## OTP / email verification codes

| Property | Value |
|----------|-------|
| Code | 6-digit numeric |
| Expiry | 10 minutes |
| Types | `email` (login), `password_reset` |
| On create | Invalidate previous unused codes of same type for user |
| On success | Mark used; then complete login / reset |

### Rebuild decision — Admin 2FA

Old `isSuperAdmin()` is broken. Choose one:

1. `users.require_otp = true` for admins, or  
2. Dedicated `super_admin` role used consistently, or  
3. OTP for **all** admins.

Document the choice in code and here.

## Password reset

1. Request by email → create `LoginVerification` type `password_reset` (or dedicated token table).
2. Verify code.
3. Update password (min 8, confirmed).
4. Invalidate codes; optionally force re-login.

## Rate limiting / lockout (`LoginAttempt`)

Tracked per email + IP (+ user agent stored).

Progressive lock durations (current code):

| Failed attempts | Lock duration |
|-----------------|---------------|
| ≥ 9 | 3600s (1h) |
| ≥ 7 | 1800s (30m) |
| ≥ 5 | 900s (15m) |
| ≥ 3 | 60s |
| else | none |

Helpers conceptually: `isLocked`, remaining lock time, record success/failure.

**Rebuild tip:** align UX copy with actual durations; consider standardizing to 5/15/30/60 minutes.

## Session policy

| Setting | Current / recommended |
|---------|------------------------|
| Idle timeout | ~30 minutes (`SessionTimeout` middleware) |
| Remember-me | Up to 1 week (10080 minutes) when selected |
| Logout | Clear remember token; invalidate session |

## Authorization after login

- Role middleware / policies guard dashboards and mutations.
- Prefer opaque public IDs (UUID) over encrypting integer IDs — same security goal as old `Crypt` IDs.

## Security requirements checklist

- [ ] Passwords hashed with modern algorithm (bcrypt/argon2)
- [ ] HTTPS only in production
- [ ] CSRF protection on cookie session apps (or JWT best practices for API)
- [ ] Rate limit login + OTP verify + password reset
- [ ] Do not leak whether email exists (optional hardening)
- [ ] Inactive users blocked even with valid password
- [ ] Session fixation protection on login
