import fs from 'fs/promises';
import path from 'path';
import type { SavedFile, StorageService } from './storage.types';

export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
  }

  async save(tenantId: number, resourceType: string, resourceId: number, file: File): Promise<SavedFile> {
    const dir = path.join(this.baseDir, String(tenantId), resourceType, String(resourceId));
    await fs.mkdir(dir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(dir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return { filePath, fileName: file.name, fileSize: buffer.length, mimeType: file.type || 'application/octet-stream' };
  }

  async delete(filePath: string): Promise<void> {
    try { await fs.unlink(filePath); } catch { /* already gone */ }
  }

  async read(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}
