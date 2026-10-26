import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const now = new Date();

  // Aggregate statistics
  const [
    totalInterns,
    activeInterns,
    completedInternships,
    tasksAssigned,
    pendingSubmissions,
    reviewsCompleted,
    overdueTasks,
    recentActivity,
    recentEmails,
  ] = await Promise.all([
    // Total interns
    prisma.user.count({ where: { role: 'INTERN' } }),
    // Active internships
    prisma.internship.count({ where: { status: 'ACTIVE' } }),
    // Completed internships
    prisma.internship.count({ where: { status: 'COMPLETED' } }),
    // Total tasks assigned
    prisma.assignment.count(),
    // Pending submissions (not yet submitted or revision requested)
    prisma.assignment.count({
      where: { status: { in: ['PENDING', 'REVISION_REQUESTED'] } },
    }),
    // Reviews completed
    prisma.review.count(),
    // Overdue tasks
    prisma.assignment.count({
      where: {
        OR: [
          { status: 'OVERDUE' },
          { status: 'PENDING', dueDate: { lt: now } },
        ],
      },
    }),
    // Recent activity logs
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    // Recent simulated outbox emails
    prisma.emailOutbox.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    metrics: {
      totalInterns,
      activeInterns,
      completedInternships,
      tasksAssigned,
      pendingSubmissions,
      reviewsCompleted,
      overdueTasks,
    },
    recentActivity,
    recentEmails,
  });
}

