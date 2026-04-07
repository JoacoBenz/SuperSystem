import { prisma } from '@/src/core/db/client';
import { logger } from '@/src/core/logger';
import type { EventType } from '@/src/shared/types/api';

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
          previousData: entry.previousData as any ?? undefined,
          newData: entry.newData as any ?? undefined,
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
