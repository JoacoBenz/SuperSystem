export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  ok: boolean;
  id?: string;
  error?: string;
  provider: string;
}

/** A swappable outbound-email channel. Implementations must never throw. */
export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
