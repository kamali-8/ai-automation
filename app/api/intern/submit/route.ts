import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import { extractTextFromFile } from '@/lib/documents/extractor';
import { reviewSubmissionWithAI, checkOllamaStatus } from '@/lib/ai/ollama';
import { progressInternship } from '@/lib/scheduler';
import { sendSimulatedEmail } from '@/lib/outbox';
import { logActivity } from '@/lib/activity';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'INTERN') {
    return NextResponse.json({ error: 'Intern access required' }, { status: 403 });
  }

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const contentType = req.headers.get('content-type') || '';
    let assignmentId = '';
    let textContent = '';
    let projectUrl = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      assignmentId = (formData.get('assignmentId') as string) || '';
      textContent = (formData.get('textContent') as string) || '';
      projectUrl = (formData.get('projectUrl') as string) || '';
      file = formData.get('file') as File | null;
    } else {
      const body = await req.json();
      assignmentId = body.assignmentId;
      textContent = body.textContent || '';
      projectUrl = body.projectUrl || '';
    }

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Verify assignment belongs to this intern
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        internship: {
          include: { intern: true, domain: true },
        },
        taskTemplate: true,
        submissions: {
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });

    if (!assignment || assignment.internship.internId !== session.id) {
      return NextResponse.json(
        { error: 'Assignment not found or does not belong to your account' },
        { status: 404 }
      );
    }

    // Check revision attempts
    const maxAttempts = assignment.internship.maxRevisionAttempts;
    const currentAttempts = assignment.submissions.length;

    if (currentAttempts >= maxAttempts && assignment.status === 'REVISION_REQUESTED') {
      return NextResponse.json(
        {
          error: `Maximum revision attempts (${maxAttempts}) reached for this task. Please contact the administrator.`,
        },
        { status: 400 }
      );
    }

    const attemptNumber = currentAttempts + 1;

    // Handle file upload safely
    let safeFilename: string | null = null;
    let originalFilename: string | null = null;
    let fileMime: string | null = null;
    let fileSize: number | null = null;
    let fileExtractedText: string | null = null;

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File exceeds maximum allowed size of 15MB.` },
          { status: 400 }
        );
      }

      originalFilename = file.name;
      fileMime = file.type || 'application/octet-stream';
      fileSize = file.size;

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      safeFilename = `sub_${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(UPLOADS_DIR, safeFilename);
      await fs.writeFile(filePath, fileBuffer);

      // Attempt text extraction from file for AI review
      const extraction = await extractTextFromFile(fileBuffer, originalFilename);
      if (extraction.status === 'SUCCESS') {
        fileExtractedText = extraction.text;
      }
    }

    // Verify there is at least text, file, or project link
    if (!textContent.trim() && !safeFilename && !projectUrl.trim()) {
      return NextResponse.json(
        { error: 'Please provide submission text, upload a file, or provide a project URL.' },
        { status: 400 }
      );
    }

    // Save submission
    const submission = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        internId: session.id,
        attemptNumber,
        textContent: textContent.trim() || null,
        projectUrl: projectUrl.trim() || null,
        filePath: safeFilename,
        fileName: originalFilename,
        fileMime,
        fileSize,
        status: 'SUBMITTED',
      },
    });

    // Update assignment status
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: 'IN_REVIEW',
        attemptsCount: attemptNumber,
      },
    });

    // Send submission confirmation simulated email
    await sendSimulatedEmail({
      recipientEmail: assignment.internship.intern.email,
      recipientName: assignment.internship.intern.name,
      emailType: 'SUBMISSION_CONFIRMED',
      subject: `Submission Received: ${assignment.title} (Attempt ${attemptNumber})`,
      bodyText: `Hello ${assignment.internship.intern.name},\n\nYour submission for "${assignment.title}" (Attempt ${attemptNumber}) has been received and queued for evaluation.\n\nYou will receive a notification once the review is completed.`,
      relatedTaskId: assignment.id,
      relatedInternshipId: assignment.internshipId,
      eventKey: `SUBMISSION-${submission.id}`,
    });

    // Trigger AI Review
    let reviewResult = null;
    let reviewError = null;
    const ollamaStatus = await checkOllamaStatus();

    if (ollamaStatus.available) {
      try {
        const aiReview = await reviewSubmissionWithAI({
          taskTitle: assignment.taskTemplate.title,
          instructions: assignment.taskTemplate.instructions,
          expectedDeliverables: assignment.taskTemplate.expectedDeliverables,
          evaluationRubric: assignment.taskTemplate.evaluationRubric,
          passingScore: assignment.internship.passingScore,
          textContent: textContent.trim(),
          projectUrl: projectUrl.trim(),
          uploadedFileName: originalFilename,
          fileExtractedText,
        });

        const review = await prisma.review.create({
          data: {
            submissionId: submission.id,
            assignmentId: assignment.id,
            reviewerType: 'AI',
            overallScore: aiReview.overallScore,
            passingThreshold: aiReview.passingThreshold,
            status: aiReview.status,
            criteriaAssessment: JSON.stringify(aiReview.criteriaAssessment),
            strengths: JSON.stringify(aiReview.strengths),
            mistakes: JSON.stringify(aiReview.mistakes),
            evidence: aiReview.evidence,
            suggestions: aiReview.suggestions,
            missingRequirements: JSON.stringify(aiReview.missingRequirements),
            limitations: aiReview.limitations,
            humanReviewRequired: aiReview.humanReviewRequired,
          },
        });

        // Update assignment status and final score
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: {
            status: aiReview.status,
            finalScore: aiReview.overallScore,
            completedAt: aiReview.status === 'PASSED' ? new Date() : null,
          },
        });

        // Send Review Feedback Simulated Email
        await sendSimulatedEmail({
          recipientEmail: assignment.internship.intern.email,
          recipientName: assignment.internship.intern.name,
          emailType: 'REVIEW_FEEDBACK',
          subject: `Review Completed: ${assignment.title} — ${aiReview.status}`,
          bodyText: `Hello ${assignment.internship.intern.name},\n\nYour submission for "${assignment.title}" has been evaluated by the AI review system.\n\nScore: ${aiReview.overallScore} / 100 (Threshold: ${aiReview.passingThreshold})\nStatus: ${aiReview.status}\n\nStrengths:\n${aiReview.strengths.map((s) => `• ${s}`).join('\n')}\n\nSuggestions:\n${aiReview.suggestions}\n\nPlease check your portal to view full details.`,
          relatedTaskId: assignment.id,
          relatedInternshipId: assignment.internshipId,
          eventKey: `REVIEW_FEEDBACK-${review.id}`,
        });

        // If PASSED, automatically progress internship!
        let progression = null;
        if (aiReview.status === 'PASSED') {
          progression = await progressInternship(assignment.internshipId);
        }

        reviewResult = {
          review,
          progression,
        };
      } catch (err: unknown) {
        reviewError = err instanceof Error ? err.message : String(err);
        // Flag for human review
        await prisma.review.create({
          data: {
            submissionId: submission.id,
            assignmentId: assignment.id,
            reviewerType: 'AI',
            overallScore: 0,
            passingThreshold: assignment.internship.passingScore,
            status: 'FAILED',
            criteriaAssessment: '[]',
            strengths: '[]',
            mistakes: '[]',
            evidence: '',
            suggestions: 'Evaluation error occurred. Admin inspection required.',
            limitations: 'AI evaluation failed during processing.',
            humanReviewRequired: true,
            adminNotes: `Evaluation error: ${reviewError}`,
          },
        });
      }
    } else {
      // Ollama is offline: flag for admin review
      await prisma.review.create({
        data: {
          submissionId: submission.id,
          assignmentId: assignment.id,
          reviewerType: 'AI',
          overallScore: 0,
          passingThreshold: assignment.internship.passingScore,
          status: 'REVISION_REQUESTED',
          criteriaAssessment: '[]',
          strengths: '[]',
          mistakes: '[]',
          evidence: '',
          suggestions:
            'Ollama AI service is currently offline. Your submission has been saved and flagged for manual administrator review.',
          limitations: 'AI offline.',
          humanReviewRequired: true,
          adminNotes: 'Awaiting administrator manual review (Ollama offline).',
        },
      });
    }

    await logActivity({
      actorId: session.id,
      actorRole: 'INTERN',
      action: 'SUBMIT_TASK',
      entityType: 'Submission',
      entityId: submission.id,
      details: {
        assignmentId,
        attemptNumber,
        hasFile: !!safeFilename,
        hasText: !!textContent.trim(),
        hasUrl: !!projectUrl.trim(),
        reviewStatus: reviewResult?.review?.status || 'Awaiting Review',
      },
    });

    return NextResponse.json({
      success: true,
      submission,
      review: reviewResult?.review || null,
      progression: reviewResult?.progression || null,
      ollamaOffline: !ollamaStatus.available,
    });
  } catch (error: unknown) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: `Submission failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

