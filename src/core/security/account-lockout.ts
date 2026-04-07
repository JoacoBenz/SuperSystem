interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
}

const store = new Map<string, LockoutEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkAccountLockout(email: string): { locked: boolean; remainingMs?: number } {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return { locked: false };

  if (entry.lockedUntil) {
    const now = Date.now();
    if (now < entry.lockedUntil) {
      return { locked: true, remainingMs: entry.lockedUntil - now };
    }
    // Lockout expired
    store.delete(key);
    return { locked: false };
  }
  return { locked: false };
}

export function recordFailedLogin(email: string): { locked: boolean } {
  const key = email.toLowerCase();
  const entry = store.get(key) ?? { failedAttempts: 0, lockedUntil: null };

  entry.failedAttempts++;
  if (entry.failedAttempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    store.set(key, entry);
    return { locked: true };
  }

  store.set(key, entry);
  return { locked: false };
}

export function clearFailedLogins(email: string): void {
  store.delete(email.toLowerCase());
}
