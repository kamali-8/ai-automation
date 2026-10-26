import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { runScheduledEvaluation } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const result = await runScheduledEvaluation();
    return NextResponse.json({
      success: true,
      message: `Evaluation completed: ${result.overdueCount} overdue updated, ${result.remindersSent} reminders dispatched, ${result.newAssignments} new assignments created.`,
      result,
    });
  } catch (error: unknown) {
    console.error('Scheduler execution error:', error);
    return NextResponse.json(
      { error: `Scheduler run failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

