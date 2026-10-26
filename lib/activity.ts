import prisma from './db';

export interface LogActivityParams {
  actorId?: string | null;
  actorRole?: 'ADMIN' | 'INTERN' | 'SYSTEM' | 'AI';
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const detailsStr =
      typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details || null;

    return await prisma.activityLog.create({
      data: {
        actorId: params.actorId || null,
        actorRole: params.actorRole || 'SYSTEM',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: detailsStr,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
    return null;
  }
}

