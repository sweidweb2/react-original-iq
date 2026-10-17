import nodemailer from 'nodemailer'

import { type AppConfig, isMailConfigured, loadConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'

export type MailAttachment = {
  filename: string
  content: Buffer
  contentType?: string
}

export type MailMessage = {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: MailAttachment[]
}

export type MailResult = {
  messageId: string | null
  /** False when the message was only logged (nothing left the server). */
  delivered: boolean
  /** Why an undelivered message was not sent. */
  skipped?: 'not_configured' | 'disabled'
}

export type Mailer = {
  isConfigured: () => boolean
  send: (message: MailMessage) => Promise<MailResult>
}

function createSmtpMailer(config: AppConfig): Mailer {
  const mail = config.mail
  const port = mail.port ?? 587
  const encryption = mail.encryption?.toLowerCase()
  const transporter = nodemailer.createTransport({
    host: mail.host,
    port,
    // 465 / ssl = implicit TLS; 587 / tls = STARTTLS upgrade.
    secure: port === 465 || encryption === 'ssl',
    requireTLS: encryption === 'tls',
    auth: mail.username ? { user: mail.username, pass: mail.password ?? '' } : undefined,
  })
  const from = mail.fromName ? `"${mail.fromName}" <${mail.fromAddress}>` : String(mail.fromAddress)

  return {
    isConfigured: () => true,
    async send(message) {
      const info = await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((item) => ({
          filename: item.filename,
          content: item.content,
          contentType: item.contentType,
        })),
      })
      return { messageId: info.messageId ?? null, delivered: true }
    },
  }
}

function createLogMailer(): Mailer {
  return {
    isConfigured: () => false,
    async send(message) {
      getLogger().info(
        {
          to: message.to,
          subject: message.subject,
          attachments: message.attachments?.map((item) => item.filename) ?? [],
        },
        'mail not configured; message logged instead of sent',
      )
      return { messageId: null, delivered: false, skipped: 'not_configured' }
    },
  }
}

/** Logs instead of sending while `isEnabled()` is false (the `emails_send` setting). */
export function withSendGate(mailer: Mailer, isEnabled: () => Promise<boolean>): Mailer {
  return {
    isConfigured: mailer.isConfigured,
    async send(message) {
      if (await isEnabled()) return mailer.send(message)
      getLogger().info(
        {
          to: message.to,
          subject: message.subject,
          attachments: message.attachments?.map((item) => item.filename) ?? [],
        },
        'email sending disabled in settings; message logged instead of sent',
      )
      return { messageId: null, delivered: false, skipped: 'disabled' }
    },
  }
}

export function createMailer(config: AppConfig = loadConfig()): Mailer {
  return isMailConfigured(config) ? createSmtpMailer(config) : createLogMailer()
}

let shared: Mailer | null = null

export function getMailer(): Mailer {
  if (!shared) shared = createMailer()
  return shared
}

/** Tests only: swap or reset the shared mailer. */
export function setMailerForTests(mailer: Mailer | null): void {
  shared = mailer
}
