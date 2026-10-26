import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'INTERN') {
    return NextResponse.json({ error: 'Intern access required' }, { status: 403 });
  }

  // Load intern's user and active internship
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      domain: true,
      internships: {
        where: { status: { in: ['ACTIVE', 'COMPLETED', 'OVERDUE'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          domain: true,
          assignments: {
            orderBy: { sequenceOrder: 'asc' },
            include: {
              taskTemplate: true,
              submissions: {
                orderBy: { attemptNumber: 'desc' },
                include: { reviews: { orderBy: { createdAt: 'desc' } } },
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

  if (!user || user.internships.length === 0) {
    return NextResponse.json(
      { error: 'No active internship found for your account.' },
      { status: 404 }
    );
  }

  const internship = user.internships[0];
  const assignments = internship.assignments;

  // Categorize tasks
  const completedTasks = assignments.filter((a) => a.status === 'PASSED');
  const currentTask =
    assignments.find((a) =>
      ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'REVISION_REQUESTED', 'OVERDUE'].includes(a.status)
    ) || null;

  // Find all domain templates to see upcoming tasks
  const allDomainTemplates = await prisma.taskTemplate.findMany({
    where: {
      domainId: internship.domainId,
      status: { in: ['APPROVED', 'ACTIVE'] },
    },
    orderBy: { sequenceOrder: 'asc' },
  });

  const assignedTemplateIds = new Set(assignments.map((a) => a.taskTemplateId));
  const upcomingTemplates = allDomainTemplates.filter((t) => !assignedTemplateIds.has(t.id));

  // Compute progress
  const totalTasks = allDomainTemplates.length;
  const progressPercent =
    totalTasks > 0 ? Math.min(100, Math.round((completedTasks.length / totalTasks) * 100)) : 0;

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      domain: internship.domain.name,
      domainSlug: internship.domain.slug,
      domainConfig: {
        maxRevisionAttempts: internship.domain.maxRevisionAttempts,
        passingScore: internship.domain.passingScore,
        allowedSubmissionFormats: internship.domain.allowedSubmissionFormats,
      },
    },
    internship: {
      id: internship.id,
      startDate: internship.startDate,
      endDate: internship.endDate,
      durationWeeks: internship.durationWeeks,
      status: internship.status,
      progressPercent,
      passingScore: internship.passingScore,
      maxRevisionAttempts: internship.maxRevisionAttempts,
    },
    currentTask,
    completedTasks,
    upcomingTasks: upcomingTemplates,
    allAssignments: assignments,
  });
}

