import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { compare } from 'bcryptjs';
import { prisma } from '@/src/core/db/client';
import { checkAccountLockout, recordFailedLogin, clearFailedLogins } from '@/src/core/security/account-lockout';
import { checkRateLimit } from '@/src/core/security/rate-limit';
import { logger } from '@/src/core/logger';

export const credentialsProvider = Credentials({
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    const email = (credentials?.email as string)?.toLowerCase()?.trim();
    const password = credentials?.password as string;
    if (!email || !password) return null;

    // Rate limit
    const rl = checkRateLimit(`login:${email}`, 10, 60_000);
    if (!rl.allowed) {
      logger.warn('security', 'rate_limited', { email });
      throw new Error('Too many login attempts. Please try again later.');
    }

    // Account lockout
    const lockout = checkAccountLockout(email);
    if (lockout.locked) {
      logger.warn('security', 'account_locked', { email });
      throw new Error('Account temporarily locked. Please try again later.');
    }

    const user = await prisma.user.findFirst({
      where: { email, active: true, deletedAt: null },
      include: { tenant: true },
    });

    if (!user || !user.passwordHash) {
      recordFailedLogin(email);
      logger.info('security', 'login_failed', { email, reason: 'invalid_credentials' });
      return null;
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      const result = recordFailedLogin(email);
      logger.info('security', 'login_failed', { email, reason: 'wrong_password', locked: result.locked });
      return null;
    }

    clearFailedLogins(email);
    logger.info('security', 'login_success', { email, userId: user.id });

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    };
  },
});

export const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowDangerousEmailAccountLinking: true,
});

export const microsoftProvider = MicrosoftEntraID({
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
  allowDangerousEmailAccountLinking: true,
});
