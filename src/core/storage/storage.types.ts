export interface SavedFile {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Common file-storage contract. Implemented by LocalStorageService (dev/disk) and
 * SupabaseStorageService (object storage). Resolve the active implementation via
 * `getStorage()` in ./index — never construct a concrete service in route code.
 */
export interface StorageService {
  save(tenantId: number, resourceType: string, resourceId: number, file: File): Promise<SavedFile>;
  read(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
}
