import prisma from './db';
import { sendSimulatedEmail } from './outbox';
import { logActivity } from './activity';

/**
 * Calculates a deterministic deadline from a starting date plus duration and extensions.
 */
export function calculateDueDate(startDate: Date, durationDays: number, extensionDays = 0): Date {
  const result = new Date(startDate.getTime());
  result.setDate(result.getDate() + durationDays + extensionDays);
  return result;
}

/**
 * Assigns the initial task (Sequence 1) for a new internship.
 * Prevents duplicate assignment if task 1 is already assigned.
 */
export async function assignInitialTask(internshipId: string) {
  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    include: {
      intern: true,
      domain: true,
      assignments: {
        where: { sequenceOrder: 1 },
      },
    },
  });

  if (!internship) {
    throw new Error(`Internship not found: ${internshipId}`);
  }

  // Already assigned?
  if (internship.assignments.length > 0) {
    return internship.assignments[0];
  }

  // Find sequence 1 task template for domain
  const template = await prisma.taskTemplate.findFirst({
    where: {
      domainId: internship.domainId,
      sequenceOrder: 1,
      status: { in: ['APPROVED', 'ACTIVE'] },
    },
    orderBy: { sequenceOrder: 'asc' },
  });

  if (!template) {
    // No task template found for domain yet
    return null;
  }

  // Calculate deterministic deadline starting from internship.startDate or now, whichever is later
  const baseStart = new Date(internship.startDate) > new Date() ? new Date(internship.startDate) : new Date();
  const dueDate = calculateDueDate(baseStart, template.suggestedDurationDays);

  const assignment = await prisma.assignment.create({
    data: {
      internshipId: internship.id,
      taskTemplateId: template.id,
      sequenceOrder: 1,
      title: template.title,
      assignedDate: baseStart,
      dueDate: dueDate,
      status: 'PENDING',
    },
  });

  // Send simulated task assigned email
  await sendSimulatedEmail({
    recipientEmail: internship.intern.email,
    recipientName: internship.intern.name,
    emailType: 'TASK_ASSIGNED',
    subject: `Task 1 Assigned: ${template.title}`,
    bodyText: `Hello ${internship.intern.name},\n\nYour first task "${template.title}" has been assigned for domain ${internship.domain.name}.\n\nObjective: ${template.learningObjective}\nDue Date: ${dueDate.toLocaleDateString()}.\n\nPlease log in to view the full instructions and rubric.`,
    relatedTaskId: assignment.id,
    relatedInternshipId: internship.id,
    eventKey: `TASK_ASSIGNED-${assignment.id}`,
  });

  await logActivity({
    actorRole: 'SYSTEM',
    action: 'TASK_ASSIGNED',
    entityType: 'Assignment',
    entityId: assignment.id,
    details: { internshipId, taskTitle: template.title, sequenceOrder: 1 },
  });

  return assignment;
}

/**
 * Progresses an internship after a submission/review.
 * If current task is PASSED: assigns next task, or marks internship complete if all finished.
 */
export async function progressInternship(internshipId: string) {
  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    include: {
      intern: true,
      domain: true,
      assignments: {
        orderBy: { sequenceOrder: 'asc' },
        include: { taskTemplate: true },
      },
    },
  });

  if (!internship) {
    throw new Error(`Internship not found: ${internshipId}`);
  }

  // Total available templates in domain
  const allTemplates = await prisma.taskTemplate.findMany({
    where: {
      domainId: internship.domainId,
      status: { in: ['APPROVED', 'ACTIVE'] },
    },
    orderBy: { sequenceOrder: 'asc' },
  });

  const totalTemplates = allTemplates.length;
  const passedAssignments = internship.assignments.filter((a) => a.status === 'PASSED');
  const progressPercent =
    totalTemplates > 0 ? Math.min(100, Math.round((passedAssignments.length / totalTemplates) * 100)) : 0;

  // Check the latest assignment
  const lastAssignment = internship.assignments[internship.assignments.length - 1];

  if (!lastAssignment) {
    return { completed: false, message: 'No assignments exist yet.' };
  }

  if (lastAssignment.status !== 'PASSED') {
    // Update progress percent
    await prisma.internship.update({
      where: { id: internship.id },
      data: { progressPercent },
    });
    return {
      completed: false,
      message: `Current task is in status ${lastAssignment.status}. Passing is required to progress.`,
    };
  }

  // Find next template
  const nextOrder = lastAssignment.sequenceOrder + 1;
  const nextTemplate = allTemplates.find((t) => t.sequenceOrder === nextOrder);

  if (!nextTemplate) {
    // All tasks completed! Mark internship completed
    await prisma.internship.update({
      where: { id: internship.id },
      data: {
        status: 'COMPLETED',
        progressPercent: 100,
      },
    });

    // Send completion simulated email
    await sendSimulatedEmail({
      recipientEmail: internship.intern.email,
      recipientName: internship.intern.name,
      emailType: 'INTERNSHIP_COMPLETED',
      subject: `Congratulations! Internship Completed - ${internship.domain.name}`,
      bodyText: `Dear ${internship.intern.name},\n\nCongratulations on successfully completing all task milestones for your ${internship.domain.name} internship!\n\nAll tasks have been reviewed and approved. Thank you for your dedication.`,
      relatedInternshipId: internship.id,
      eventKey: `INTERNSHIP_COMPLETED-${internship.id}`,
    });

    await logActivity({
      actorRole: 'SYSTEM',
      action: 'INTERNSHIP_COMPLETED',
      entityType: 'Internship',
      entityId: internship.id,
      details: { internName: internship.intern.name, totalTasks: totalTemplates },
    });

    return { completed: true, message: 'All tasks completed successfully! Internship completed.' };
  }

  // Check if next task was already assigned to avoid duplicate
  const existingNext = internship.assignments.find((a) => a.sequenceOrder === nextOrder);
  if (existingNext) {
    return { completed: false, nextAssignment: existingNext, message: 'Next task was already assigned.' };
  }

  // Create next assignment
  const now = new Date();
  const dueDate = calculateDueDate(now, nextTemplate.suggestedDurationDays);

  const newAssignment = await prisma.assignment.create({
    data: {
      internshipId: internship.id,
      taskTemplateId: nextTemplate.id,
      sequenceOrder: nextOrder,
      title: nextTemplate.title,
      assignedDate: now,
      dueDate: dueDate,
      status: 'PENDING',
    },
  });

  // Update internship progress
  await prisma.internship.update({
    where: { id: internship.id },
    data: { progressPercent },
  });

  // Send Next Task simulated email
  await sendSimulatedEmail({
    recipientEmail: internship.intern.email,
    recipientName: internship.intern.name,
    emailType: 'NEXT_TASK',
    subject: `Next Task Assigned: Task ${nextOrder} - ${nextTemplate.title}`,
    bodyText: `Hello ${internship.intern.name},\n\nGreat work passing your previous task!\n\nYour next task "${nextTemplate.title}" is now active.\nObjective: ${nextTemplate.learningObjective}\nDue Date: ${dueDate.toLocaleDateString()}.\n\nPlease check your intern portal to view the task instructions.`,
    relatedTaskId: newAssignment.id,
    relatedInternshipId: internship.id,
    eventKey: `NEXT_TASK-${newAssignment.id}`,
  });

  await logActivity({
    actorRole: 'SYSTEM',
    action: 'NEXT_TASK_ASSIGNED',
    entityType: 'Assignment',
    entityId: newAssignment.id,
    details: { sequenceOrder: nextOrder, taskTitle: nextTemplate.title },
  });

  return { completed: false, nextAssignment: newAssignment, message: `Task ${nextOrder} assigned.` };
}

/**
 * Runs the database-backed scheduled check:
 * - Detects overdue pending assignments and updates status to OVERDUE.
 * - Dispatches simulated deadline reminders and overdue notifications.
 * - Assigns initial task to interns whose start date has arrived.
 */
export async function runScheduledEvaluation() {
  const now = new Date();
  let overdueCount = 0;
  let remindersSent = 0;
  let newAssignments = 0;

  // 1. Check all pending assignments
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      status: 'PENDING',
    },
    include: {
      internship: {
        include: { intern: true, domain: true },
      },
      taskTemplate: true,
    },
  });

  for (const assignment of pendingAssignments) {
    const due = new Date(assignment.dueDate);

    if (now > due) {
      // Overdue!
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: 'OVERDUE' },
      });
      overdueCount++;

      // Send overdue email (deduped by assignment id)
      await sendSimulatedEmail({
        recipientEmail: assignment.internship.intern.email,
        recipientName: assignment.internship.intern.name,
        emailType: 'TASK_OVERDUE',
        subject: `Overdue Notice: ${assignment.title}`,
        bodyText: `Hello ${assignment.internship.intern.name},\n\nYour task "${assignment.title}" for ${assignment.internship.domain.name} was due on ${due.toLocaleDateString()} and is now overdue.\n\nPlease submit your work as soon as possible or contact the admin for an extension.`,
        relatedTaskId: assignment.id,
        relatedInternshipId: assignment.internshipId,
        eventKey: `OVERDUE-${assignment.id}`,
      });
    } else {
      // Check if due within 24 hours for reminder
      const msUntilDue = due.getTime() - now.getTime();
      const hoursUntilDue = msUntilDue / (1000 * 60 * 60);

      if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
        const { duplicate } = await sendSimulatedEmail({
          recipientEmail: assignment.internship.intern.email,
          recipientName: assignment.internship.intern.name,
          emailType: 'DEADLINE_REMINDER',
          subject: `Reminder: Task "${assignment.title}" is due soon`,
          bodyText: `Hello ${assignment.internship.intern.name},\n\nThis is a friendly reminder that your task "${assignment.title}" is due on ${due.toLocaleDateString()}.\n\nEnsure you submit your work on time.`,
          relatedTaskId: assignment.id,
          relatedInternshipId: assignment.internshipId,
          eventKey: `REMINDER-${assignment.id}`,
        });
        if (!duplicate) remindersSent++;
      }
    }
  }

  // 2. Check for active internships with 0 assignments whose start date is <= now
  const unassignedInternships = await prisma.internship.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: now },
      assignments: { none: {} },
    },
  });

  for (const internship of unassignedInternships) {
    const initial = await assignInitialTask(internship.id);
    if (initial) newAssignments++;
  }

  await logActivity({
    actorRole: 'SYSTEM',
    action: 'SCHEDULE_EVALUATION_RUN',
    entityType: 'Scheduler',
    details: { overdueCount, remindersSent, newAssignments, timestamp: now.toISOString() },
  });

  return {
    checkedAt: now,
    overdueCount,
    remindersSent,
    newAssignments,
  };
}

