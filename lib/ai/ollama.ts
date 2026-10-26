import {
  TaskPlanListSchema,
  TaskPlanItem,
  ReviewOutputSchema,
  ReviewOutput,
} from '../validation';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen2.5:latest';

export function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  };
}

export class OllamaUnavailableError extends Error {
  constructor(message: string = 'Ollama service is not reachable. Please ensure Ollama is running locally.') {
    super(message);
    this.name = 'OllamaUnavailableError';
  }
}

/**
 * Checks connection to local Ollama instance and returns available models.
 */
export async function checkOllamaStatus(): Promise<{
  available: boolean;
  models: string[];
  selectedModel: string;
  baseUrl: string;
  error?: string;
}> {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        available: false,
        models: [],
        selectedModel: model,
        baseUrl,
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const modelNames = (data.models || []).map((m) => m.name);

    return {
      available: true,
      models: modelNames,
      selectedModel: model,
      baseUrl,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      available: false,
      models: [],
      selectedModel: model,
      baseUrl,
      error: `Could not connect to Ollama at ${baseUrl} (${errMsg}). Ensure 'ollama serve' is running.`,
    };
  }
}

/**
 * Generates structured domain tasks from extracted syllabus materials using Ollama.
 */
export async function generateTaskPlanWithAI(
  domainName: string,
  syllabusContent: string,
  taskCount: number = 3
): Promise<TaskPlanItem[]> {
  const { baseUrl, model } = getOllamaConfig();
  const status = await checkOllamaStatus();

  if (!status.available) {
    throw new OllamaUnavailableError(
      `Ollama is unavailable at ${baseUrl}. Please start Ollama locally using 'ollama serve' and pull the model '${model}', or create tasks manually.`
    );
  }

  const prompt = `You are an expert curriculum designer and internship task architect.
Create a structured sequence of ${taskCount} progressive, hands-on tasks for an internship in "${domainName}".
Base the tasks on this approved syllabus material:
"""
${syllabusContent.slice(0, 4000)}
"""

REQUIREMENTS:
1. Generate exactly ${taskCount} sequential tasks (sequenceOrder starting from 1).
2. Each task must have:
   - "sequenceOrder": integer (1, 2, 3...)
   - "title": concise task title
   - "topic": syllabus topic covered
   - "learningObjective": clear measurable objective
   - "instructions": detailed step-by-step instructions
   - "expectedDeliverables": exact deliverables (e.g. source files, README, test cases)
   - "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
   - "suggestedDurationDays": integer (e.g. 2, 3, or 5)
   - "deadlineRules": string explanation
   - "evaluationRubric": array of rubric objects { "criterion": string, "points": number, "description": string } summing to 100 points
   - "passingCriteria": clear threshold string (e.g. "Score >= 70% with functional code and tests")
   - "allowedSubmissionFormats": "text,zip,pdf,py,js,ts,ipynb,docx"

Output STRICT VALID JSON only with this schema:
{
  "tasks": [
    {
      "sequenceOrder": 1,
      "title": "...",
      "topic": "...",
      "learningObjective": "...",
      "instructions": "...",
      "expectedDeliverables": "...",
      "difficulty": "BEGINNER",
      "suggestedDurationDays": 3,
      "deadlineRules": "Due within 3 days",
      "evaluationRubric": [
        {"criterion": "Functionality", "points": 50, "description": "Works correctly"},
        {"criterion": "Code Quality", "points": 30, "description": "Clean and documented"},
        {"criterion": "Deliverables", "points": 20, "description": "All files provided"}
      ],
      "passingCriteria": "Minimum 70 points out of 100",
      "allowedSubmissionFormats": "text,zip,pdf,py,js,ts,ipynb,docx"
    }
  ]
}`;

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as { response: string };
    const parsedJson = JSON.parse(data.response);
    const validated = TaskPlanListSchema.parse(parsedJson);

    return validated.tasks;
  } catch (err: unknown) {
    if (err instanceof OllamaUnavailableError) throw err;
    throw new Error(`AI Task Generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Reviews a submission using Ollama against task instructions and rubric.
 */
export async function reviewSubmissionWithAI(params: {
  taskTitle: string;
  instructions: string;
  expectedDeliverables: string;
  evaluationRubric: string;
  passingScore: number;
  textContent?: string | null;
  projectUrl?: string | null;
  uploadedFileName?: string | null;
  fileExtractedText?: string | null;
}): Promise<ReviewOutput> {
  const { baseUrl, model } = getOllamaConfig();
  const status = await checkOllamaStatus();

  if (!status.available) {
    throw new OllamaUnavailableError(
      `Ollama is unavailable at ${baseUrl}. Review cannot be performed automatically. Submission flagged for admin review.`
    );
  }

  const prompt = `You are a strict, fair, and constructive technical internship evaluator.
Evaluate this intern's task submission against the provided evaluation rubric and instructions.

TASK DETAILS:
- Title: ${params.taskTitle}
- Instructions: ${params.instructions}
- Expected Deliverables: ${params.expectedDeliverables}
- Evaluation Rubric: ${params.evaluationRubric}
- Passing Threshold: ${params.passingScore} points out of 100

INTERN'S SUBMISSION:
- Text Response:
"""
${params.textContent || '(No direct text provided)'}
"""
- Project / Repository URL: ${params.projectUrl || '(None)'}
- Uploaded File: ${params.uploadedFileName || '(None)'}
- Uploaded File Content:
"""
${(params.fileExtractedText || '').slice(0, 4000) || '(No extracted file content)'}
"""

INSTRUCTIONS:
1. Grade strictly based on evidence present in the submission. Do NOT invent work that wasn't submitted.
2. If the submission is empty or missing major deliverables, award a failing score.
3. Compute an overallScore (0-100).
4. If overallScore >= ${params.passingScore}, status is "PASSED". If close (50-${params.passingScore - 1}), status is "REVISION_REQUESTED". If < 50, status is "FAILED".
5. Note limitations: "Static analysis conducted without runtime execution."
6. If submission cannot be thoroughly evaluated from text alone (e.g. requires runtime server execution), set humanReviewRequired: true.

Output strictly valid JSON with this exact structure:
{
  "overallScore": 85,
  "passingThreshold": ${params.passingScore},
  "status": "PASSED",
  "criteriaAssessment": [
    {
      "criterion": "Requirement Fulfilled",
      "score": 40,
      "maxScore": 50,
      "comments": "Detailed evaluation comment"
    }
  ],
  "strengths": ["Clear structure", "Followed instructions"],
  "mistakes": ["Missing edge-case validation"],
  "evidence": "Quotes or references from submission",
  "suggestions": "Actionable feedback for improvement",
  "missingRequirements": [],
  "limitations": "Static evaluation without arbitrary code execution",
  "humanReviewRequired": false
}`;

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama review generation failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as { response: string };
    const parsedJson = JSON.parse(data.response);
    const validated = ReviewOutputSchema.parse(parsedJson);

    return validated;
  } catch (err: unknown) {
    if (err instanceof OllamaUnavailableError) throw err;
    throw new Error(`AI Review evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * AI Chatbot Tutor for Interns.
 * Explains assigned task instructions, breaks down steps, clarifies concepts.
 */
export async function chatWithTaskTutor(params: {
  taskTitle: string;
  instructions: string;
  expectedDeliverables: string;
  syllabusContext?: string;
  previousFeedback?: string;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userQuestion: string;
}): Promise<{
  reply: string;
  available: boolean;
  error?: string;
}> {
  const { baseUrl, model } = getOllamaConfig();
  const status = await checkOllamaStatus();

  if (!status.available) {
    return {
      available: false,
      reply: `AI Assistant is currently offline. Please review your task instructions directly:\n\nTask: ${params.taskTitle}\nInstructions: ${params.instructions}\nExpected Deliverables: ${params.expectedDeliverables}`,
      error: status.error || 'Ollama is offline',
    };
  }

  const systemMessage = `You are a supportive, knowledgeable AI Internship Mentor.
The intern is asking questions about their current task.

CURRENT TASK:
- Title: ${params.taskTitle}
- Instructions: ${params.instructions}
- Expected Deliverables: ${params.expectedDeliverables}
${params.syllabusContext ? `- Approved Syllabus Context:\n${params.syllabusContext.slice(0, 2000)}` : ''}
${params.previousFeedback ? `- Previous Review Feedback:\n${params.previousFeedback}` : ''}

GUIDELINES:
1. Explain instructions in plain, encouraging language.
2. Break down complex steps into small, manageable action items.
3. Answer conceptual questions using the approved syllabus where relevant.
4. If asked about previous feedback, explain how to address identified mistakes.
5. NEVER invent new unassigned requirements or contradict the task instructions.
6. Do NOT write complete solution code that does the intern's work for them; guide them and teach the concepts.`;

  const messages = [
    { role: 'system', content: systemMessage },
    ...params.chatHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: params.userQuestion },
  ];

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.4,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama chat returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const reply = data.message?.content || 'No response generated.';

    return {
      available: true,
      reply,
    };
  } catch (err: unknown) {
    return {
      available: false,
      reply: `AI Assistant encountered an error. Here are your original task instructions:\n\nTask: ${params.taskTitle}\nInstructions: ${params.instructions}`,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

