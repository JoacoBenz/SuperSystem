import { getTenantConfigValue } from '@/src/core/tenant/config';
import { stubOcrProvider } from './stub.provider';
import { anthropicOcrProvider } from './anthropic.provider';
import type { OcrProvider } from './types';

export type { OcrInput, OcrResult, OcrLine, OcrProvider } from './types';

/** Resolve the tenant OCR provider: config `ocr_provider` → env → `stub`. */
export async function getOcrProvider(tenantId: number): Promise<OcrProvider> {
  let choice = 'stub';
  try {
    choice = await getTenantConfigValue(tenantId, 'ocr_provider', process.env.OCR_PROVIDER ?? 'stub');
  } catch {
    choice = 'stub';
  }
  if (choice === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return anthropicOcrProvider(process.env.ANTHROPIC_API_KEY);
  }
  return stubOcrProvider;
}
