import { logger } from '@/src/core/logger';
import type { EmailProvider } from './types';

/** Default provider — records the email without sending. Offline-safe; never throws. */
export const logEmailProvider: EmailProvider = {
  name: 'log',
  async send(message) {
    logger.info('notification', 'email_logged', { to: message.to, subject: message.subject });
    return { ok: true, provider: 'log' };
  },
};
