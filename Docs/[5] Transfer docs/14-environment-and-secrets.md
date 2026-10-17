# 14 — Environment & Secrets Checklist

Provision these for each environment (local / staging / production). **Never commit secret values.**

## Application

| Key                                  | Purpose                           |
| ------------------------------------ | --------------------------------- |
| `APP_NAME`                           | Branding                          |
| `APP_ENV`                            | local/staging/production          |
| `APP_KEY`                            | Encryption / cookies (framework)  |
| `APP_DEBUG`                          | Off in production                 |
| `APP_URL`                            | Canonical URL (callbacks, emails) |
| `APP_LOCALE` / `APP_FALLBACK_LOCALE` | `en` / `ar`                       |

## Database

| Key                                                                   | Purpose            |
| --------------------------------------------------------------------- | ------------------ |
| `DB_CONNECTION`                                                       | mysql/pgsql/sqlite |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | Connection         |

## Session / cache / queue

| Key                | Purpose                    |
| ------------------ | -------------------------- |
| `SESSION_*`        | Driver + lifetime          |
| `CACHE_STORE`      |                            |
| `QUEUE_CONNECTION` | For mail/PDF jobs if async |

## Mail

| Key                                    | Purpose      |
| -------------------------------------- | ------------ |
| `MAIL_MAILER`                          | smtp/ses/etc |
| `MAIL_HOST` / `MAIL_PORT`              |              |
| `MAIL_USERNAME` / `MAIL_PASSWORD`      |              |
| `MAIL_ENCRYPTION`                      | tls/ssl      |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` |              |

## Object storage (R2 / S3)

| Key                           | Purpose             |
| ----------------------------- | ------------------- |
| `AWS_ACCESS_KEY_ID`           |                     |
| `AWS_SECRET_ACCESS_KEY`       |                     |
| `AWS_DEFAULT_REGION`          | often `auto` for R2 |
| `AWS_BUCKET`                  |                     |
| `AWS_ENDPOINT`                | R2 endpoint         |
| `AWS_URL`                     | Optional base URL   |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `true` for R2       |
| `FILESYSTEM_DISK`             | e.g. `s3`           |

## MontyPay

| Key                          | Purpose      |
| ---------------------------- | ------------ |
| `MONTYPAY_API_URL`           | API base     |
| `MONTYPAY_MERCHANT_KEY`      | Merchant key |
| `MONTYPAY_MERCHANT_PASSWORD` | Used in hash |

> These were used in code but missing from old `.env.example` — always document them.

## Optional integrations

| Key               | Purpose                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`  | Public chatbot                                                                               |
| `FX_API_URL`      | Exchange-rate base URL (default `https://open.er-api.com/v6/latest`; `/{CURRENCY}` appended) |
| `FX_CACHE_TTL_MS` | In-memory rate cache lifetime (default `3600000` = 1 hour)                                   |
| FX API key        | If you switch off the free open.er-api.com endpoint                                          |

## Ops checklist before go-live

- [ ] `APP_DEBUG=false`
- [ ] HTTPS + secure cookies
- [ ] MontyPay callback URL reachable publicly
- [ ] Mail deliverability (SPF/DKIM)
- [ ] R2 bucket private; only signed/authenticated access
- [ ] Backups for DB
- [ ] Log redaction (no card data / raw passwords)
- [ ] Rate limits enabled on auth + chatbot + webhooks
- [ ] Seed first admin out-of-band

## Local dev minimum

1. DB + migrate
2. Mail trap (Mailpit/Mailhog)
3. R2 or local disk adapter
4. MontyPay sandbox **or** mock PaymentGateway
5. Optional: skip Gemini with stub chatbot

## Mapping note for new stack

Rename env vars to your framework conventions, but keep this **capability checklist** identical so nothing is forgotten during cutover.
