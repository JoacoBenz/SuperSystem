import NextAuth from 'next-auth';
import { prisma } from '@/src/core/db/client';
import { resolveUserPermissions } from '@/src/core/permissions/delegation';
import { credentialsProvider, googleProvider, microsoftProvider } from './providers';
import { logger } from '@/src/core/logger';
import { moduleRegistry } from '@/src/core/modules/registry';
import '@/src/core/modules/loader';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    credentialsProvider,
    ...(process.env.GOOGLE_CLIENT_ID ? [googleProvider] : []),
    ...(process.env.AZURE_AD_CLIENT_ID ? [microsoftProvider] : []),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  // Trust the Vercel/proxy host header; force secure (HTTPS-only) cookies in prod.
  // Session cookies are httpOnly + sameSite=lax by default in NextAuth v5.
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === 'credentials') return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      const domain = email.split('@')[1];
      const providerName = account.provider === 'google' ? 'google' : 'microsoft';

      // Find tenant with SSO enabled for this domain
      const tenants = await prisma.tenant.findMany({
        where: { status: 'active', deletedAt: null },
        include: { tenantConfigs: true },
      });

      let matchedTenant: typeof tenants[0] | null = null;
      for (const tenant of tenants) {
        const configs = new Map(tenant.tenantConfigs.map(c => [c.key, c.value]));
        const ssoEnabled = configs.get(`sso_${providerName}_enabled`) === 'true';
        const ssoDomain = configs.get('sso_domain');

        if (ssoEnabled && ssoDomain === domain) {
          matchedTenant = tenant;
          break;
        }
      }

      if (!matchedTenant) {
        logger.warn('security', 'sso_domain_rejected', { email, provider: providerName, domain });
        return false;
      }

      // Find or create user
      let dbUser = await prisma.user.findFirst({
        where: { email, tenantId: matchedTenant.id },
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            tenantId: matchedTenant.id,
            name: user.name ?? email.split('@')[0],
            email,
            oauthProvider: providerName,
            oauthSub: account.providerAccountId,
            orgRole: 'member',
            active: true,
          },
        });
        logger.info('security', 'sso_user_created', { email, tenantId: matchedTenant.id });
      } else if (!dbUser.oauthProvider) {
        // Link OAuth to existing account
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { oauthProvider: providerName, oauthSub: account.providerAccountId },
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in from credentials
        const u = user as Record<string, unknown>;
        token.userId = u.id ? Number(u.id) : undefined;
        token.tenantId = u.tenantId as number | undefined;
      }

      // Load user data on every token refresh
      if (token.userId && typeof token.userId === 'number') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          include: { department: true },
        });

        if (dbUser) {
          token.tenantId = dbUser.tenantId;
          token.orgRole = dbUser.orgRole;
          token.departmentId = dbUser.departmentId;
          token.departmentName = dbUser.department?.name ?? null;
          token.name = dbUser.name;
          token.email = dbUser.email;

          if (dbUser.orgRole === 'super_admin') {
            // Super admin gets all permissions from all modules
            token.permissions = moduleRegistry.getAllPermissions().map(
              p => `${p.moduleId}.${p.resource}.${p.action}`
            );
          } else {
            const permissions = await resolveUserPermissions(dbUser.tenantId, dbUser.id);
            token.permissions = permissions;
          }
        }
      } else if (token.email) {
        // OAuth flow - lookup by email
        const dbUser = await prisma.user.findFirst({
          where: { email: token.email.toLowerCase(), active: true, deletedAt: null },
          include: { department: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.tenantId = dbUser.tenantId;
          token.orgRole = dbUser.orgRole;
          token.departmentId = dbUser.departmentId;
          token.departmentName = dbUser.department?.name ?? null;

          const permissions = dbUser.orgRole === 'super_admin'
            ? moduleRegistry.getAllPermissions().map(p => `${p.moduleId}.${p.resource}.${p.action}`)
            : await resolveUserPermissions(dbUser.tenantId, dbUser.id);
          token.permissions = permissions;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const user = session.user as unknown as Record<string, unknown>;
        user.userId = token.userId;
        user.tenantId = token.tenantId;
        user.orgRole = token.orgRole;
        user.departmentId = token.departmentId;
        user.departmentName = token.departmentName;
        user.permissions = token.permissions;
      }
      return session;
    },
  },
});
