import { z } from 'zod'

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production'])

const DURATION_UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const

/** `15m`, `12h`, `7d` → milliseconds. */
const durationSchema = z
  .string()
  .trim()
  .regex(/^\d+[smhd]$/, 'Use a number followed by s, m, h, or d (e.g. 15m, 7d)')
  .transform((value) => {
    const unit = value.slice(-1) as keyof typeof DURATION_UNIT_MS
    return Number(value.slice(0, -1)) * DURATION_UNIT_MS[unit]
  })
  .refine((ms) => ms > 0, 'Duration must be greater than zero')

const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().min(1).default('Original IQ'),
  APP_URL: z.string().min(1).optional(),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  JWT_ACCESS_EXPIRES_IN: durationSchema.prefault('15m'),
  /** Absolute session lifetime from sign-in; refreshing never extends it. */
  JWT_REFRESH_EXPIRES_IN: durationSchema.prefault('7d'),
  JSON_BODY_LIMIT: z.string().min(1).default('100kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  /** Per-account cap on login + password-reset attempts within the auth window. */
  AUTH_EMAIL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MAIL_MAILER: z.string().min(1).optional(),
  MAIL_HOST: z.string().min(1).optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USERNAME: z.string().min(1).optional(),
  MAIL_PASSWORD: z.string().min(1).optional(),
  MAIL_ENCRYPTION: z.string().min(1).optional(),
  MAIL_FROM_ADDRESS: z.string().min(1).optional(),
  MAIL_FROM_NAME: z.string().min(1).optional(),

  /** Private Supabase Storage bucket for task files, solutions, and invoices. */
  SUPABASE_STORAGE_BUCKET: z.string().trim().min(1).optional(),
  /** Max bytes per single object upload (default 25 MiB). */
  STORAGE_MAX_FILE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(25 * 1024 * 1024),
  /** Soft cap for total bytes under one task (default 100 MiB). */
  STORAGE_MAX_TASK_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),
  /** Signed URL lifetime in seconds (default 15 minutes). */
  STORAGE_SIGNED_URL_TTL_SEC: z.coerce.number().int().positive().default(900),

  /** `simulated` completes checkout instantly (no gateway); `montypay` reserved for the real gateway. */
  PAYMENT_GATEWAY_MODE: z.enum(['simulated', 'montypay']).default('simulated'),

  MONTYPAY_API_URL: z.string().url().optional(),
  MONTYPAY_MERCHANT_KEY: z.string().min(1).optional(),
  MONTYPAY_MERCHANT_PASSWORD: z.string().min(1).optional(),
  MONTYPAY_CALLBACK_SECRET: z.string().min(1).optional(),

  /** Base URL; `/{CURRENCY}` is appended (open.er-api.com response shape). */
  FX_API_URL: z.string().url().default('https://open.er-api.com/v6/latest'),
  FX_CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),

  GEMINI_API_KEY: z.string().min(1).optional(),
  HUGGINGFACE_API_KEY: z.string().min(1).optional(),
})

export type MailConfig = {
  mailer?: string
  host?: string
  port?: number
  username?: string
  password?: string
  encryption?: string
  fromAddress?: string
  fromName?: string
}

export type StorageConfig = {
  provider: 'supabase'
  bucket: string
  maxFileBytes: number
  maxTaskBytes: number
  signedUrlTtlSec: number
}

export type MontyPayConfig = {
  apiUrl: string
  merchantKey: string
  merchantPassword: string
  callbackSecret: string
}

export type FxConfig = {
  apiUrl: string
  cacheTtlMs: number
}

export type AppConfig = {
  env: z.infer<typeof nodeEnvSchema>
  port: number
  appName: string
  appUrl?: string
  corsOrigins: string[]
  trustProxy: boolean
  supabaseUrl?: string
  supabaseServiceRoleKey?: string
  supabaseAnonKey?: string
  databaseUrl?: string
  jwtAccessSecret?: string
  jwtRefreshSecret?: string
  jwtAccessTtlMs: number
  /** Absolute session lifetime (refresh token + session row). */
  sessionTtlMs: number
  jsonBodyLimit: string
  rateLimitWindowMs: number
  rateLimitMax: number
  authRateLimitWindowMs: number
  authRateLimitMax: number
  authEmailRateLimitMax: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  mail: MailConfig
  storage?: StorageConfig
  paymentGatewayMode: 'simulated' | 'montypay'
  montypay?: MontyPayConfig
  fx: FxConfig
  geminiApiKey?: string
  huggingfaceApiKey?: string
}

function parseCorsOrigins(raw: string | undefined, env: AppConfig['env']): string[] {
  const fallback = 'http://localhost:5173'

  if (env === 'production' || env === 'staging') {
    if (!raw || raw.trim().length === 0) {
      throw new Error('CORS_ORIGINS is required when NODE_ENV is staging or production')
    }
  }

  const value = (raw && raw.trim().length > 0 ? raw : fallback)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (value.length === 0) {
    throw new Error('CORS_ORIGINS must include at least one origin')
  }

  if (value.includes('*')) {
    throw new Error('CORS_ORIGINS must not use "*" (credentials-safe allowlist only)')
  }

  return value
}

const MIN_JWT_SECRET_LENGTH = 32

/** Deployed environments must not boot with weak auth secrets or proxy-blind rate limits. */
function assertDeployedSecurity(data: z.infer<typeof baseEnvSchema>): void {
  if (data.NODE_ENV !== 'production' && data.NODE_ENV !== 'staging') return

  const problems: string[] = []
  const access = data.JWT_ACCESS_SECRET
  const refresh = data.JWT_REFRESH_SECRET
  if (!access || !refresh) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required')
  } else {
    if (access.length < MIN_JWT_SECRET_LENGTH || refresh.length < MIN_JWT_SECRET_LENGTH) {
      problems.push(`JWT secrets must be at least ${MIN_JWT_SECRET_LENGTH} characters`)
    }
    if (access === refresh) {
      problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ')
    }
  }
  if (!data.TRUST_PROXY) {
    problems.push(
      'TRUST_PROXY=true is required behind the Vercel proxy (rate limits key on client IP)',
    )
  }

  if (problems.length > 0) {
    throw new Error(`Invalid ${data.NODE_ENV} configuration: ${problems.join('; ')}`)
  }
}

function parseStorage(data: z.infer<typeof baseEnvSchema>): StorageConfig | undefined {
  if (!data.SUPABASE_STORAGE_BUCKET) {
    return undefined
  }

  if (!data.SUPABASE_URL || !data.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Storage config incomplete: SUPABASE_STORAGE_BUCKET requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    )
  }

  return {
    provider: 'supabase',
    bucket: data.SUPABASE_STORAGE_BUCKET,
    maxFileBytes: data.STORAGE_MAX_FILE_BYTES,
    maxTaskBytes: data.STORAGE_MAX_TASK_BYTES,
    signedUrlTtlSec: data.STORAGE_SIGNED_URL_TTL_SEC,
  }
}

function parseMontyPay(data: z.infer<typeof baseEnvSchema>): MontyPayConfig | undefined {
  const hasAny =
    data.MONTYPAY_API_URL ||
    data.MONTYPAY_MERCHANT_KEY ||
    data.MONTYPAY_MERCHANT_PASSWORD ||
    data.MONTYPAY_CALLBACK_SECRET

  if (!hasAny) {
    return undefined
  }

  if (
    !data.MONTYPAY_API_URL ||
    !data.MONTYPAY_MERCHANT_KEY ||
    !data.MONTYPAY_MERCHANT_PASSWORD ||
    !data.MONTYPAY_CALLBACK_SECRET
  ) {
    throw new Error(
      'MontyPay config incomplete: require MONTYPAY_API_URL, MONTYPAY_MERCHANT_KEY, MONTYPAY_MERCHANT_PASSWORD, MONTYPAY_CALLBACK_SECRET',
    )
  }

  return {
    apiUrl: data.MONTYPAY_API_URL,
    merchantKey: data.MONTYPAY_MERCHANT_KEY,
    merchantPassword: data.MONTYPAY_MERCHANT_PASSWORD,
    callbackSecret: data.MONTYPAY_CALLBACK_SECRET,
  }
}

/** `KEY=` lines in `.env` arrive as `''`; treat them as unset so optional/default fields apply. */
function withoutBlankValues(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ''),
  )
}

/**
 * Load and validate env once. Call from server entry / createApp — not from domain code.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = baseEnvSchema.safeParse(withoutBlankValues(env))

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration: ${details}`)
  }

  const data = parsed.data
  assertDeployedSecurity(data)

  return {
    env: data.NODE_ENV,
    port: data.PORT,
    appName: data.APP_NAME,
    appUrl: data.APP_URL,
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS, data.NODE_ENV),
    trustProxy: data.TRUST_PROXY,
    supabaseUrl: data.SUPABASE_URL,
    supabaseServiceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: data.SUPABASE_ANON_KEY,
    databaseUrl: data.DATABASE_URL,
    jwtAccessSecret: data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: data.JWT_REFRESH_SECRET,
    jwtAccessTtlMs: data.JWT_ACCESS_EXPIRES_IN,
    sessionTtlMs: data.JWT_REFRESH_EXPIRES_IN,
    jsonBodyLimit: data.JSON_BODY_LIMIT,
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: data.RATE_LIMIT_MAX,
    authRateLimitWindowMs: data.AUTH_RATE_LIMIT_WINDOW_MS,
    authRateLimitMax: data.AUTH_RATE_LIMIT_MAX,
    authEmailRateLimitMax: data.AUTH_EMAIL_RATE_LIMIT_MAX,
    logLevel: data.LOG_LEVEL,
    mail: {
      mailer: data.MAIL_MAILER,
      host: data.MAIL_HOST,
      port: data.MAIL_PORT,
      username: data.MAIL_USERNAME,
      password: data.MAIL_PASSWORD,
      encryption: data.MAIL_ENCRYPTION,
      fromAddress: data.MAIL_FROM_ADDRESS,
      fromName: data.MAIL_FROM_NAME,
    },
    storage: parseStorage(data),
    paymentGatewayMode: data.PAYMENT_GATEWAY_MODE,
    montypay: parseMontyPay(data),
    fx: {
      apiUrl: data.FX_API_URL.replace(/\/+$/, ''),
      cacheTtlMs: data.FX_CACHE_TTL_MS,
    },
    geminiApiKey: data.GEMINI_API_KEY,
    huggingfaceApiKey: data.HUGGINGFACE_API_KEY,
  }
}

export function requireJwtSecrets(config: AppConfig): {
  accessSecret: string
  refreshSecret: string
} {
  if (!config.jwtAccessSecret || !config.jwtRefreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required for authentication')
  }
  return {
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
  }
}

export function isSupabaseConfigured(config: AppConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey)
}

export function isMailConfigured(config: AppConfig): boolean {
  return Boolean(config.mail.host && config.mail.port && config.mail.fromAddress)
}

export function isStorageConfigured(config: AppConfig): boolean {
  return Boolean(config.storage)
}

export function requireStorageConfig(config: AppConfig): StorageConfig {
  if (!config.storage) {
    throw new Error('Storage is not configured (SUPABASE_STORAGE_BUCKET env var required)')
  }
  return config.storage
}

export function requireMontyPayConfig(config: AppConfig): MontyPayConfig {
  if (!config.montypay) {
    throw new Error('MontyPay is not configured (MONTYPAY_* env vars required)')
  }
  return config.montypay
}
