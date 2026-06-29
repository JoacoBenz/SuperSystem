import { prisma } from '@/src/core/db/client';
import { logger } from '@/src/core/logger';
import type { EventType } from '@/src/shared/types/api';

// Field names whose values must never be written to the audit log in cleartext.
const SENSITIVE_KEY = /^(tax_?id|account_?number|bank_?details|password|password_?hash|token|secret|api_?key|encryption_?key)$/i;

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redactSensitive(v);
    }
    return out;
  }
  return value;
}

export interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: number;
  moduleId?: string;
  eventType?: EventType;
  previousData?: unknown;
  newData?: unknown;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  constructor(
    private tenantId: number,
    private userId: number,
    private ipAddress: string,
    private userAgent?: string,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: this.tenantId,
          userId: this.userId,
          moduleId: entry.moduleId ?? null,
          eventType: entry.eventType ?? 'data_change',
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          previousData: entry.previousData != null ? (redactSensitive(entry.previousData) as any) : undefined,
          newData: entry.newData != null ? (redactSensitive(entry.newData) as any) : undefined,
          metadata: entry.metadata as any ?? undefined,
          ipAddress: this.ipAddress,
          userAgent: this.userAgent ?? null,
        },
      });
    } catch (error) {
      logger.error('audit', 'audit_log_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry,
      });
    }
  }
}
