import type { OcrProvider } from './types';

/** Default provider — no extraction; signals the UI to fall back to manual entry. Never throws. */
export const stubOcrProvider: OcrProvider = {
  name: 'stub',
  async extract() {
    return { configured: false, note: 'No OCR provider configured — enter the bill manually.' };
  },
};
