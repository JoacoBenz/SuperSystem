import type { StorageService } from './storage.types';
import { LocalStorageService } from './local-storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

export type { SavedFile, StorageService } from './storage.types';

let instance: StorageService | null = null;

/**
 * Returns the active storage backend (memoized). Uses Supabase object storage when
 * the Supabase env is configured (required on Vercel — the local FS is ephemeral and
 * wiped on every deploy), otherwise falls back to local disk for dev.
 */
export function getStorage(): StorageService {
  if (instance) return instance;
  instance =
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new SupabaseStorageService()
      : new LocalStorageService();
  return instance;
}
