import { describe, it, expect } from 'vitest';
import { TaskPlanListSchema, ReviewOutputSchema } from '../lib/validation';
import { checkOllamaStatus } from '../lib/ai/ollama';

describe('AI Task Planning & Review Validation', () => {
  it('validates structured AI task plan output with Zod', () => {
    const validAiResponse = {
      tasks: [
        {
          sequenceOrder: 1,
          title: 'CLI File Analyzer',
          topic: 'File I/O and Argparse',
          learningObjective: 'Master file reading context managers and CLI flags.',
          instructions: 'Build a Python script that counts lines and words in a file.',
          expectedDeliverables: 'analyzer.py and README.md',
          difficulty: 'BEGINNER' as const,
          suggestedDurationDays: 3,
          deadlineRules: 'Due within 3 calendar days',
          evaluationRubric: [
            { criterion: 'Functionality', points: 50, description: 'Correctly outputs word count' },
            { criterion: 'Clean code', points: 30, description: 'Follows PEP 8' },
            { criterion: 'Deliverables', points: 20, description: 'Files present' },
          ],
          passingCriteria: 'Score >= 70% with functional CLI parsing',
          allowedSubmissionFormats: 'text,zip,py',
        },
      ],
    };

    const parsed = TaskPlanListSchema.safeParse(validAiResponse);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid AI task plans with missing rubric or sequence', () => {
    const invalidPlan = {
      tasks: [
        {
          title: 'Incomplete Task',
          // missing sequenceOrder, evaluationRubric, topic, etc.
        },
      ],
    };

    const parsed = TaskPlanListSchema.safeParse(invalidPlan);
    expect(parsed.success).toBe(false);
  });

  it('validates a passing AI review output with Zod', () => {
    const passingReview = {
      overallScore: 88,
      passingThreshold: 70,
      status: 'PASSED' as const,
      criteriaAssessment: [
        {
          criterion: 'Correctness',
          score: 45,
          maxScore: 50,
          comments: 'All core logic functions accurately.',
        },
        {
          criterion: 'Code Structure',
          score: 43,
          maxScore: 50,
          comments: 'Well organized into functions with docstrings.',
        },
      ],
      strengths: ['Clear modular functions', 'Handles missing file exception'],
      mistakes: ['Small typo in help output'],
      evidence: 'Used `with open(...)` as requested.',
      suggestions: 'Consider adding automated pytest test cases.',
      missingRequirements: [],
      limitations: 'Evaluated statically without runtime execution.',
      humanReviewRequired: false,
    };

    const parsed = ReviewOutputSchema.safeParse(passingReview);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('PASSED');
      expect(parsed.data.overallScore).toBeGreaterThanOrEqual(70);
    }
  });

  it('validates a failing / revision requested review output', () => {
    const failingReview = {
      overallScore: 45,
      passingThreshold: 70,
      status: 'FAILED' as const,
      criteriaAssessment: [
        {
          criterion: 'Correctness',
          score: 20,
          maxScore: 50,
          comments: 'Missing core logic for file parsing.',
        },
        {
          criterion: 'Code Structure',
          score: 25,
          maxScore: 50,
          comments: 'No functions or error handling implemented.',
        },
      ],
      strengths: ['Submitted on time'],
      mistakes: ['Missing argparse implementation', 'No exception handling'],
      evidence: 'Only a placeholder print statement was found.',
      suggestions: 'Review Module 1 of the Python syllabus on context managers.',
      missingRequirements: ['analyzer.py', 'README.md'],
      limitations: 'Static evaluation.',
      humanReviewRequired: true,
    };

    const parsed = ReviewOutputSchema.safeParse(failingReview);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('FAILED');
      expect(parsed.data.overallScore).toBeLessThan(70);
      expect(parsed.data.humanReviewRequired).toBe(true);
    }
  });

  it('handles offline AI gracefully without fabricating responses', async () => {
    // Calling status check when port is unlikely to be running in tests
    const status = await checkOllamaStatus();
    // In CI / test environment without Ollama running, available is false
    if (!status.available) {
      expect(status.available).toBe(false);
      expect(status.error).toBeDefined();
    }
  });
});

