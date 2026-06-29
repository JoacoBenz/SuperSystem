import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SavedFile, StorageService } from './storage.types';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'attachments';

/**
 * Object storage backed by a PRIVATE Supabase Storage bucket. Files are never public;
 * downloads go through the app (which re-checks auth) or short-lived signed URLs.
 * Uses the service-role key, so this must only ever run server-side.
 */
export class SupabaseStorageService implements StorageService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async save(tenantId: number, resourceType: string, resourceId: number, file: File): Promise<SavedFile> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `${tenantId}/${resourceType}/${resourceId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    const { error } = await this.client.storage.from(BUCKET).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    return { filePath: objectPath, fileName: file.name, fileSize: buffer.length, mimeType };
  }

  async read(filePath: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(BUCKET).download(filePath);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? 'not found'}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(filePath: string): Promise<void> {
    await this.client.storage.from(BUCKET).remove([filePath]);
  }

  /** Short-lived signed URL; pass downloadName to force a download with that filename. */
  async createSignedUrl(filePath: string, expiresIn = 300, downloadName?: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(filePath, expiresIn, downloadName ? { download: downloadName } : undefined);
    if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? 'unknown'}`);
    return data.signedUrl;
  }
}
