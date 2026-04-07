import type { TenantDB } from '@/src/core/db/tenant-client';

export interface FilterDefinition {
  key: string;
  label: string;
  type: 'date_range' | 'select' | 'text' | 'number';
  options?: Array<{ label: string; value: string }>;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  requiredPermissions: string[];
  filters: FilterDefinition[];
  columns: ColumnDefinition[];
  query: (filters: Record<string, unknown>, db: TenantDB) => Promise<unknown[]>;
}
