import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { chatWithTaskTutor } from '@/lib/ai/ollama';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'INTERN') {
    return NextResponse.json({ error: 'Intern access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { assignmentId, question, chatHistory = [] } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        internship: {
          include: {
            domain: {
              include: {
                learningMaterials: {
                  where: { isActive: true, extractionStatus: 'SUCCESS' },
                  take: 2,
                },
              },
            },
          },
        },
        taskTemplate: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assignment || assignment.internship.internId !== session.id) {
      return NextResponse.json(
        { error: 'Assignment not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Prepare syllabus context
    const syllabusSnippets = assignment.internship.domain.learningMaterials
      .map((m) => `[${m.title}]:\n${m.extractedText || ''}`)
      .join('\n\n');

    // Prepare previous feedback
    const lastReview = assignment.reviews[0];
    const previousFeedback = lastReview
      ? `Previous Review Score: ${lastReview.overallScore}/100. Status: ${lastReview.status}. Suggestions: ${lastReview.suggestions}`
      : undefined;

    const result = await chatWithTaskTutor({
      taskTitle: assignment.taskTemplate.title,
      instructions: assignment.taskTemplate.instructions,
      expectedDeliverables: assignment.taskTemplate.expectedDeliverables,
      syllabusContext: syllabusSnippets,
      previousFeedback,
      chatHistory,
      userQuestion: question.trim(),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Chat tutor error:', error);
    return NextResponse.json(
      { error: `Chat tutor error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

