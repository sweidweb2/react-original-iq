export type ContactMessageInput = {
  name: string
  email: string
  subject: string | null
  message: string
}

export type LeadInput = {
  country: string
  phone: string
}

export type ContactResult = {
  ok: true
}
