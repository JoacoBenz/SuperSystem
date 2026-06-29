import { checkRateLimit, peekRateLimit, resetRateLimit } from './rate-limit';

// Durable account lockout layered on the shared rate_limits store: after MAX_ATTEMPTS
// failed logins within the window, the account is locked for the rest of the window.

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const key = (email: string) => `lockout:${email.toLowerCase()}`;

export async function checkAccountLockout(email: string): Promise<{ locked: boolean; remainingMs?: number }> {
  const entry = await peekRateLimit(key(email));
  if (entry && entry.count >= MAX_ATTEMPTS) {
    return { locked: true, remainingMs: Math.max(0, entry.resetAt - Date.now()) };
  }
  return { locked: false };
}

export async function recordFailedLogin(email: string): Promise<{ locked: boolean }> {
  const r = await checkRateLimit(key(email), MAX_ATTEMPTS, LOCKOUT_DURATION_MS);
  // remaining hits 0 exactly when the attempt count reaches MAX_ATTEMPTS.
  return { locked: r.remaining <= 0 };
}

export async function clearFailedLogins(email: string): Promise<void> {
  await resetRateLimit(key(email));
}
