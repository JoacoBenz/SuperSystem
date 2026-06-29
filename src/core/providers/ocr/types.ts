export interface OcrInput {
  fileName?: string;
  mimeType?: string;
  text?: string;
}

export interface OcrLine {
  description: string;
  quantity: number;
  unitCost: number;
}

export interface OcrResult {
  configured: boolean;
  vendorName?: string;
  invoiceNumber?: string;
  total?: number;
  lines?: OcrLine[];
  note?: string;
}

export interface OcrProvider {
  name: string;
  extract(input: OcrInput): Promise<OcrResult>;
}
