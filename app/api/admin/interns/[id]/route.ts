import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const intern = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      domain: true,
      internships: {
        include: {
          domain: true,
          assignments: {
            orderBy: { sequenceOrder: 'asc' },
            include: {
              taskTemplate: true,
              submissions: {
                orderBy: { attemptNumber: 'desc' },
                include: { reviews: true },
              },
              reviews: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  if (!intern || intern.role !== 'INTERN') {
    return NextResponse.json({ error: 'Intern not found' }, { status: 404 });
  }

  return NextResponse.json({ intern });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { internshipId, extensionDays, status, endDate } = body;

    if (internshipId) {
      const updated = await prisma.internship.update({
        where: { id: internshipId },
        data: {
          ...(status && { status }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
      });

      if (extensionDays && extensionDays > 0) {
        // Apply extension to current pending/overdue assignment
        const pending = await prisma.assignment.findFirst({
          where: {
            internshipId,
            status: { in: ['PENDING', 'OVERDUE', 'REVISION_REQUESTED'] },
          },
          orderBy: { sequenceOrder: 'desc' },
        });

        if (pending) {
          const newDueDate = new Date(pending.dueDate);
          newDueDate.setDate(newDueDate.getDate() + Number(extensionDays));
          await prisma.assignment.update({
            where: { id: pending.id },
            data: {
              dueDate: newDueDate,
              extensionDays: (pending.extensionDays || 0) + Number(extensionDays),
              status: pending.status === 'OVERDUE' ? 'PENDING' : pending.status,
            },
          });
        }
      }

      await logActivity({
        actorId: session.id,
        actorRole: 'ADMIN',
        action: 'UPDATE_INTERNSHIP',
        entityType: 'Internship',
        entityId: internshipId,
        details: body,
      });

      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: 'Internship ID required' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `Update failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

