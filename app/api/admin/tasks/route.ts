import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { ManualTaskSchema } from '@/lib/validation';
import { generateTaskPlanWithAI } from '@/lib/ai/ollama';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get('domainId');

  const tasks = await prisma.taskTemplate.findMany({
    where: {
      ...(domainId && { domainId }),
    },
    include: {
      domain: true,
      syllabus: true,
      _count: { select: { assignments: true } },
    },
    orderBy: [{ domainId: 'asc' }, { sequenceOrder: 'asc' }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action || 'manual'; // 'manual' | 'ai_generate' | 'approve' | 'archive'

    // Case 1: Approve or change status of task template
    if (action === 'approve') {
      const { taskId, status = 'APPROVED' } = body;
      const updated = await prisma.taskTemplate.update({
        where: { id: taskId },
        data: { status },
      });

      await logActivity({
        actorId: session.id,
        actorRole: 'ADMIN',
        action: 'APPROVE_TASK',
        entityType: 'TaskTemplate',
        entityId: taskId,
        details: { newStatus: status },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    // Case 2: AI Task Generation from approved syllabus materials
    if (action === 'ai_generate') {
      const { domainId, count = 3 } = body;
      if (!domainId) {
        return NextResponse.json({ error: 'Domain ID is required for AI task planning' }, { status: 400 });
      }

      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        include: {
          syllabi: {
            where: { isActive: true },
            include: {
              materials: {
                where: { isActive: true, extractionStatus: 'SUCCESS' },
              },
            },
          },
          learningMaterials: {
            where: { isActive: true, extractionStatus: 'SUCCESS' },
          },
        },
      });

      if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
      }

      // Collect all extracted text
      const textPieces: string[] = [];
      for (const m of domain.learningMaterials) {
        if (m.extractedText) textPieces.push(`Document [${m.title}]:\n${m.extractedText}`);
      }
      for (const syl of domain.syllabi) {
        for (const m of syl.materials) {
          if (m.extractedText && !textPieces.includes(m.extractedText)) {
            textPieces.push(`Document [${m.title}]:\n${m.extractedText}`);
          }
        }
      }

      const combinedSyllabus = textPieces.join('\n\n---\n\n').trim();
      if (!combinedSyllabus) {
        return NextResponse.json(
          {
            error:
              'No readable syllabus or learning materials found for this domain. Please upload and extract materials first before generating tasks with AI.',
          },
          { status: 400 }
        );
      }

      // Call Ollama Qwen model
      const generatedTasks = await generateTaskPlanWithAI(domain.name, combinedSyllabus, Number(count) || 3);

      // Check current max sequenceOrder in domain
      const existingMax = await prisma.taskTemplate.aggregate({
        where: { domainId },
        _max: { sequenceOrder: true },
      });
      const startOrder = (existingMax._max.sequenceOrder || 0) + 1;

      // Save as DRAFT tasks (requires admin approval before activation)
      const createdTasks = [];
      const primarySyllabus = domain.syllabi[0];

      for (let i = 0; i < generatedTasks.length; i++) {
        const item = generatedTasks[i];
        const task = await prisma.taskTemplate.create({
          data: {
            domainId,
            syllabusId: primarySyllabus ? primarySyllabus.id : null,
            sequenceOrder: startOrder + i,
            title: item.title,
            topic: item.topic,
            learningObjective: item.learningObjective,
            instructions: item.instructions,
            expectedDeliverables: item.expectedDeliverables,
            difficulty: item.difficulty,
            suggestedDurationDays: item.suggestedDurationDays,
            deadlineRules: item.deadlineRules,
            evaluationRubric: JSON.stringify(item.evaluationRubric),
            passingCriteria: item.passingCriteria,
            allowedSubmissionFormats: item.allowedSubmissionFormats,
            status: 'DRAFT', // Saved as DRAFT per specification
          },
        });
        createdTasks.push(task);
      }

      await logActivity({
        actorId: session.id,
        actorRole: 'ADMIN',
        action: 'AI_TASKS_GENERATED',
        entityType: 'TaskTemplate',
        details: { domainName: domain.name, tasksGenerated: createdTasks.length },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully generated ${createdTasks.length} task drafts. Review and approve them to activate.`,
        tasks: createdTasks,
      });
    }

    // Case 3: Manual Task Creation
    const parsed = ManualTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid task parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const task = await prisma.taskTemplate.create({
      data: {
        domainId: data.domainId,
        syllabusId: data.syllabusId || null,
        title: data.title,
        topic: data.topic,
        learningObjective: data.learningObjective,
        instructions: data.instructions,
        expectedDeliverables: data.expectedDeliverables,
        difficulty: data.difficulty,
        suggestedDurationDays: data.suggestedDurationDays,
        deadlineRules: data.deadlineRules || `Due within ${data.suggestedDurationDays} days`,
        evaluationRubric: data.evaluationRubric,
        passingCriteria: data.passingCriteria,
        allowedSubmissionFormats: data.allowedSubmissionFormats,
        sequenceOrder: data.sequenceOrder,
        status: 'APPROVED',
      },
    });

    await logActivity({
      actorId: session.id,
      actorRole: 'ADMIN',
      action: 'MANUAL_TASK_CREATED',
      entityType: 'TaskTemplate',
      entityId: task.id,
      details: { title: task.title, domainId: task.domainId },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: unknown) {
    console.error('Task endpoint error:', error);
    return NextResponse.json(
      { error: `Task operation failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

