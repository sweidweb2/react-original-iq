export type ContactMessageInput = {
  name: string
  email: string
  subject: string | null
  message: string
}

export type ContactResult = {
  ok: true
}
