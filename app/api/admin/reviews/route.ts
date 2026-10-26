import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { progressInternship } from '@/lib/scheduler';
import { sendSimulatedEmail } from '@/lib/outbox';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const reviews = await prisma.review.findMany({
    include: {
      submission: {
        include: {
          intern: true,
        },
      },
      assignment: {
        include: {
          taskTemplate: true,
          internship: {
            include: {
              domain: true,
              intern: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { reviewId, overallScore, status, adminNotes } = body;

    if (!reviewId || !status) {
      return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        assignment: {
          include: {
            internship: {
              include: { intern: true, domain: true },
            },
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Update review with admin override
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        overallScore: typeof overallScore === 'number' ? overallScore : review.overallScore,
        status,
        adminNotes: adminNotes || 'Admin manual override',
        isOverridden: true,
        reviewerType: 'ADMIN',
      },
    });

    // Update assignment status & score
    await prisma.assignment.update({
      where: { id: review.assignmentId },
      data: {
        status,
        finalScore: typeof overallScore === 'number' ? overallScore : review.overallScore,
        completedAt: status === 'PASSED' ? new Date() : null,
      },
    });

    // Dispatch simulated feedback email
    const intern = review.assignment.internship.intern;
    await sendSimulatedEmail({
      recipientEmail: intern.email,
      recipientName: intern.name,
      emailType: 'REVIEW_FEEDBACK',
      subject: `Evaluation Result Updated: ${review.assignment.title}`,
      bodyText: `Hello ${intern.name},\n\nYour submission for "${review.assignment.title}" has been reviewed by the administrator.\n\nResult: ${status}\nScore: ${updatedReview.overallScore} / 100\nAdmin Notes: ${adminNotes || 'None'}\n\nPlease check your intern dashboard for detailed feedback.`,
      relatedTaskId: review.assignmentId,
      relatedInternshipId: review.assignment.internshipId,
    });

    // If passed, progress to next task!
    let progressionResult = null;
    if (status === 'PASSED') {
      progressionResult = await progressInternship(review.assignment.internshipId);
    }

    await logActivity({
      actorId: session.id,
      actorRole: 'ADMIN',
      action: 'OVERRIDE_REVIEW',
      entityType: 'Review',
      entityId: review.id,
      details: { newStatus: status, score: updatedReview.overallScore, adminNotes },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      progression: progressionResult,
    });
  } catch (error: unknown) {
    console.error('Review override error:', error);
    return NextResponse.json(
      { error: `Override failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

