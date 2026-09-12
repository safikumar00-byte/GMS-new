import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

export type AuditAction = 
  | 'USER_PROVISIONED'
  | 'MEMBER_CREATED'
  | 'MEMBER_UPDATED'
  | 'MEMBER_DELETED'
  | 'MEMBER_ARCHIVED'
  | 'MEMBERSHIP_RENEWED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_REFUNDED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'ROLE_CHANGED'
  | 'GYM_STATUS_CHANGED'
  | 'GYM_CONFIG_UPDATED'
  | 'BACKUP_EXPORTED';

export type AuditEntityType = 
  | 'USER'
  | 'MEMBER'
  | 'MEMBERSHIP'
  | 'PAYMENT'
  | 'EXPENSE'
  | 'GYM'
  | 'BACKUP';

export interface AuditEventParams {
  gymId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  details?: string | null;
  tx?: any; // optional Drizzle transaction
}

export async function logAuditEvent({
  gymId,
  userId,
  action,
  entityType,
  entityId,
  details,
  tx,
}: AuditEventParams): Promise<void> {
  try {
    const executor = tx || db;
    await executor.insert(auditLogs).values({
      gymId,
      userId: userId || null,
      action,
      entityType,
      entityId: entityId || null,
      details: details ? details.substring(0, 500) : null,
    });
  } catch (error) {
    // Audit log insertion should never throw in a way that disrupts user workflow, but log error
    console.error(`[AUDIT ERROR] Failed to record audit log (${action}):`, error);
  }
}
