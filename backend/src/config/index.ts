import { z } from 'zod'

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production'])

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
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  JSON_BODY_LIMIT: z.string().min(1).default('100kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  MAIL_MAILER: z.string().min(1).optional(),
  MAIL_HOST: z.string().min(1).optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USERNAME: z.string().min(1).optional(),
  MAIL_PASSWORD: z.string().min(1).optional(),
  MAIL_ENCRYPTION: z.string().min(1).optional(),
  MAIL_FROM_ADDRESS: z.string().min(1).optional(),
  MAIL_FROM_NAME: z.string().min(1).optional(),

  STORAGE_PROVIDER: z.enum(['r2']).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_DEFAULT_REGION: z.string().min(1).default('auto'),
  AWS_BUCKET: z.string().min(1).optional(),
  AWS_ENDPOINT: z.string().min(1).optional(),
  AWS_URL: z.string().min(1).optional(),
  AWS_USE_PATH_STYLE_ENDPOINT: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),

  MONTYPAY_API_URL: z.string().url().optional(),
  MONTYPAY_MERCHANT_KEY: z.string().min(1).optional(),
  MONTYPAY_MERCHANT_PASSWORD: z.string().min(1).optional(),
  MONTYPAY_CALLBACK_SECRET: z.string().min(1).optional(),

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
  provider: 'r2'
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  endpoint: string
  publicUrl?: string
  usePathStyleEndpoint: boolean
}

export type MontyPayConfig = {
  apiUrl: string
  merchantKey: string
  merchantPassword: string
  callbackSecret: string
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
  jwtAccessExpiresIn: string
  jwtRefreshExpiresIn: string
  jsonBodyLimit: string
  rateLimitWindowMs: number
  rateLimitMax: number
  authRateLimitWindowMs: number
  authRateLimitMax: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  mail: MailConfig
  storage?: StorageConfig
  montypay?: MontyPayConfig
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

function parseStorage(data: z.infer<typeof baseEnvSchema>): StorageConfig | undefined {
  const hasAny =
    data.STORAGE_PROVIDER ||
    data.AWS_ACCESS_KEY_ID ||
    data.AWS_SECRET_ACCESS_KEY ||
    data.AWS_BUCKET ||
    data.AWS_ENDPOINT

  if (!hasAny) {
    return undefined
  }

  if (
    data.STORAGE_PROVIDER !== 'r2' ||
    !data.AWS_ACCESS_KEY_ID ||
    !data.AWS_SECRET_ACCESS_KEY ||
    !data.AWS_BUCKET ||
    !data.AWS_ENDPOINT
  ) {
    throw new Error(
      'Storage config incomplete: require STORAGE_PROVIDER=r2, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, AWS_ENDPOINT',
    )
  }

  return {
    provider: 'r2',
    accessKeyId: data.AWS_ACCESS_KEY_ID,
    secretAccessKey: data.AWS_SECRET_ACCESS_KEY,
    region: data.AWS_DEFAULT_REGION,
    bucket: data.AWS_BUCKET,
    endpoint: data.AWS_ENDPOINT,
    publicUrl: data.AWS_URL,
    usePathStyleEndpoint: data.AWS_USE_PATH_STYLE_ENDPOINT ?? true,
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

/**
 * Load and validate env once. Call from server entry / createApp — not from domain code.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = baseEnvSchema.safeParse(env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration: ${details}`)
  }

  const data = parsed.data

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
    jwtAccessExpiresIn: data.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: data.JWT_REFRESH_EXPIRES_IN,
    jsonBodyLimit: data.JSON_BODY_LIMIT,
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: data.RATE_LIMIT_MAX,
    authRateLimitWindowMs: data.AUTH_RATE_LIMIT_WINDOW_MS,
    authRateLimitMax: data.AUTH_RATE_LIMIT_MAX,
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
    montypay: parseMontyPay(data),
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

export function requireStorageConfig(config: AppConfig): StorageConfig {
  if (!config.storage) {
    throw new Error('Storage is not configured (AWS_* / STORAGE_PROVIDER env vars required)')
  }
  return config.storage
}

export function requireMontyPayConfig(config: AppConfig): MontyPayConfig {
  if (!config.montypay) {
    throw new Error('MontyPay is not configured (MONTYPAY_* env vars required)')
  }
  return config.montypay
}
