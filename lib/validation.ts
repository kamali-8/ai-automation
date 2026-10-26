import { z } from 'zod';

// Roster Excel row validation
export const RosterRowSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  domain: z.string().trim().min(2, 'Domain must be specified'),
  startDate: z.string().optional().or(z.date().optional()),
  durationWeeks: z.number().int().positive().max(52).optional().default(4),
});

export type RosterRow = z.infer<typeof RosterRowSchema>;

export const RosterImportSchema = z.array(RosterRowSchema);

// AI Task Generation Schema
export const RubricItemSchema = z.object({
  criterion: z.string().min(2),
  points: z.number().int().positive(),
  description: z.string().min(5),
});

export const TaskPlanItemSchema = z.object({
  sequenceOrder: z.number().int().positive(),
  title: z.string().min(3),
  topic: z.string().min(2),
  learningObjective: z.string().min(10),
  instructions: z.string().min(15),
  expectedDeliverables: z.string().min(10),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  suggestedDurationDays: z.number().int().positive().min(1).max(30).default(3),
  deadlineRules: z.string().default('Due within specified calendar days of assignment'),
  evaluationRubric: z.array(RubricItemSchema).min(1),
  passingCriteria: z.string().min(5),
  allowedSubmissionFormats: z.string().default('text,zip,pdf,py,js,ts,ipynb,docx'),
});

export const TaskPlanListSchema = z.object({
  tasks: z.array(TaskPlanItemSchema).min(1),
});

export type TaskPlanItem = z.infer<typeof TaskPlanItemSchema>;

// AI Submission Review Schema
export const CriterionAssessmentSchema = z.object({
  criterion: z.string(),
  score: z.number().min(0).max(100),
  maxScore: z.number().min(1).max(100),
  comments: z.string(),
});

export const ReviewOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  passingThreshold: z.number().int().min(0).max(100).default(70),
  status: z.enum(['PASSED', 'REVISION_REQUESTED', 'FAILED']),
  criteriaAssessment: z.array(CriterionAssessmentSchema),
  strengths: z.array(z.string()).min(1),
  mistakes: z.array(z.string()),
  evidence: z.string().optional().default(''),
  suggestions: z.string().min(5),
  missingRequirements: z.array(z.string()).default([]),
  limitations: z.string().default('Evaluation conducted statically against criteria without arbitrary runtime execution.'),
  humanReviewRequired: z.boolean().default(false),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

// Submission Validation
export const SubmissionInputSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  textContent: z.string().optional(),
  projectUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

// Admin Manual Task Creation Schema
export const ManualTaskSchema = z.object({
  domainId: z.string().min(1, 'Domain is required'),
  syllabusId: z.string().optional(),
  title: z.string().min(3, 'Title is required'),
  topic: z.string().min(2, 'Topic is required'),
  learningObjective: z.string().min(5, 'Learning objective is required'),
  instructions: z.string().min(10, 'Instructions are required'),
  expectedDeliverables: z.string().min(5, 'Deliverables description is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  suggestedDurationDays: z.number().int().positive().min(1).max(30).default(3),
  deadlineRules: z.string().optional(),
  evaluationRubric: z.string().min(5, 'Rubric must be provided'),
  passingCriteria: z.string().min(5, 'Passing criteria is required'),
  allowedSubmissionFormats: z.string().default('text,zip,pdf,py,js,ts,ipynb,docx'),
  sequenceOrder: z.number().int().positive().default(1),
});

// Admin Login Schema
export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Intern Login Schema
export const InternLoginSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

