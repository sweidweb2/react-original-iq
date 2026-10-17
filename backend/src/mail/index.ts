/**
 * Outbound email (SMTP via MAIL_* env; Mailtrap in this project).
 * Falls back to a log-only transport when MAIL_HOST is unset.
 */
export {
  createMailer,
  getMailer,
  type MailAttachment,
  type Mailer,
  type MailMessage,
  type MailResult,
  setMailerForTests,
} from './mailer.js'
