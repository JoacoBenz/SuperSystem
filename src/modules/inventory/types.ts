export interface StockEntry {
  id: number;
  tenantId: number;
  receptionId: number;
  purchaseRequestItemId: number;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number | null;
  vendorId: number | null;
  conforming: boolean;
  notes: string | null;
  receivedAt: Date;
  createdBy: number;
  createdAt: Date;
}

export interface CreateStockEntryInput {
  receptionId: number;
  purchaseRequestItemId: number;
  description: string;
  quantity: number;
  unit: string;
  unitCost?: number | null;
  vendorId?: number | null;
  conforming: boolean;
  notes?: string | null;
}
