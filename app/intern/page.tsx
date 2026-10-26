'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  MessageSquareCode,
  FileText,
  ExternalLink,
  Award,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface InternDashboardData {
  profile: {
    id: string;
    name: string;
    email: string;
    domain: string;
    domainConfig: {
      maxRevisionAttempts: number;
      passingScore: number;
      allowedSubmissionFormats: string;
    };
  };
  internship: {
    id: string;
    startDate: string;
    endDate: string;
    durationWeeks: number;
    status: string;
    progressPercent: number;
    passingScore: number;
    maxRevisionAttempts: number;
  };
  currentTask: {
    id: string;
    title: string;
    sequenceOrder: number;
    assignedDate: string;
    dueDate: string;
    extensionDays: number;
    status: string;
    finalScore: number | null;
    attemptsCount: number;
    taskTemplate: {
      topic: string;
      learningObjective: string;
      instructions: string;
      expectedDeliverables: string;
      difficulty: string;
      suggestedDurationDays: number;
      evaluationRubric: string;
      passingCriteria: string;
      allowedSubmissionFormats: string;
    };
    submissions: Array<{
      id: string;
      attemptNumber: number;
      textContent: string | null;
      projectUrl: string | null;
      fileName: string | null;
      createdAt: string;
      reviews: Array<{
        id: string;
        overallScore: number;
        status: string;
        suggestions: string;
        strengths: string;
        mistakes: string;
        evidence: string | null;
        reviewerType: string;
        adminNotes: string | null;
        humanReviewRequired: boolean;
      }>;
    }>;
  } | null;
  completedTasks: Array<{
    id: string;
    title: string;
    sequenceOrder: number;
    finalScore: number | null;
    completedAt: string | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    sequenceOrder: number;
    topic: string;
    difficulty: string;
    suggestedDurationDays: number;
  }>;
}

export default function InternDashboardPage() {
  const [data, setData] = useState<InternDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission Form State
  const [textContent, setTextContent] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    score?: number;
    status?: string;
  } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intern/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitWork(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.currentTask) return;

    setSubmitting(true);
    setSubmitFeedback(null);

    const formData = new FormData();
    formData.append('assignmentId', data.currentTask.id);
    if (textContent.trim()) formData.append('textContent', textContent.trim());
    if (projectUrl.trim()) formData.append('projectUrl', projectUrl.trim());
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/intern/submit', {
        method: 'POST',
        body: formData,
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Submission failed');

      if (resData.ollamaOffline) {
        setSubmitFeedback({
          type: 'warning',
          message:
            'Submission saved! (Ollama AI is offline, so your submission is flagged for administrator manual review).',
        });
      } else if (resData.review) {
        const passed = resData.review.status === 'PASSED';
        setSubmitFeedback({
          type: passed ? 'success' : 'warning',
          message: passed
            ? `Congratulations! You scored ${resData.review.overallScore}/100 and passed this milestone! Next task has been assigned.`
            : `Review completed. Score: ${resData.review.overallScore}/100 (Threshold: ${data.internship.passingScore}). Status: ${resData.review.status}. Check feedback below.`,
          score: resData.review.overallScore,
          status: resData.review.status,
        });
      } else {
        setSubmitFeedback({
          type: 'success',
          message: 'Submission successfully received and logged.',
        });
      }

      setTextContent('');
      setProjectUrl('');
      setFile(null);
      await loadDashboard();
    } catch (err: unknown) {
      setSubmitFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#69746B' }}>Loading your internship portal...</div>;
  }

  if (error || !data) {
    return (
      <div className="alert-banner alert-danger">
        <span>Error: {error || 'Could not load your internship profile.'}</span>
      </div>
    );
  }

  const { profile, internship, currentTask, completedTasks, upcomingTasks } = data;
  const isCompleted = internship.status === 'COMPLETED' || (!currentTask && completedTasks.length > 0);

  return (
    <div>
      {/* Hero Internship Progress Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FAF8F1 0%, #DCEBD7 100%)', border: '1px solid #B8D8B0', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-neutral" style={{ background: '#ffffff' }}>
                {profile.domain}
              </span>
              <span
                className={`badge ${
                  internship.status === 'COMPLETED'
                    ? 'badge-success'
                    : internship.status === 'OVERDUE'
                    ? 'badge-danger'
                    : 'badge-info'
                }`}
              >
                {internship.status}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#29332B' }}>
              Welcome back, {profile.name}!
            </h1>
            <p style={{ fontSize: '13px', color: '#69746B', marginTop: '4px' }}>
              Individual schedule: {new Date(internship.startDate).toLocaleDateString()} →{' '}
              {new Date(internship.endDate).toLocaleDateString()} ({internship.durationWeeks} weeks)
            </p>
          </div>

          <div style={{ minWidth: '220px', background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E3E7E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>Curriculum Progress</span>
              <span>{internship.progressPercent}%</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${internship.progressPercent}%` }} />
            </div>
            <div style={{ fontSize: '11px', color: '#69746B', marginTop: '6px' }}>
              {completedTasks.length} milestone(s) completed
            </div>
          </div>
        </div>
      </div>

      {/* Completion Celebration if All Tasks Finished */}
      {isCompleted && (
        <div className="card" style={{ background: '#DCFCE7', border: '2px solid #16a34a', textAlign: 'center', padding: '36px' }}>
          <Award size={48} color="#15803D" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#166534' }}>
            Internship Milestones Completed!
          </h2>
          <p style={{ fontSize: '14px', color: '#14532d', maxWidth: '540px', margin: '8px auto 0' }}>
            Congratulations! You have completed all assigned curriculum tasks for {profile.domain}.
            Your completion email has been logged to the outbox and your certificate of completion is pending admin dispatch.
          </p>
        </div>
      )}

      {/* Current Active Task Card */}
      {currentTask && (
        <div className="card" style={{ borderTop: '4px solid #B8D8B0' }}>
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-neutral">Task Milestone {currentTask.sequenceOrder}</span>
                <span className="badge badge-neutral">{currentTask.taskTemplate.difficulty}</span>
                <span
                  className={`badge ${
                    currentTask.status === 'PASSED'
                      ? 'badge-success'
                      : currentTask.status === 'OVERDUE'
                      ? 'badge-danger'
                      : currentTask.status === 'REVISION_REQUESTED'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                >
                  {currentTask.status}
                </span>
              </div>
              <div className="card-title" style={{ fontSize: '20px' }}>
                {currentTask.title}
              </div>
              <div className="card-subtitle">Topic: {currentTask.taskTemplate.topic}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#69746B' }}>Submission Deadline</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: new Date() > new Date(currentTask.dueDate) ? '#B42318' : '#29332B' }}>
                {new Date(currentTask.dueDate).toLocaleDateString()}
              </div>
              {currentTask.extensionDays > 0 && (
                <div style={{ fontSize: '11px', color: '#15803D' }}>
                  +{currentTask.extensionDays} days approved extension
                </div>
              )}
            </div>
          </div>

          {/* Quick link to AI Tutor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#E2ECF8', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquareCode size={20} color="#1d4ed8" />
              <div style={{ fontSize: '13px', color: '#1e3a5f' }}>
                Need help understanding instructions or breaking down steps?
              </div>
            </div>
            <Link href="/intern/chat" className="btn btn-pastel-blue btn-sm" style={{ background: '#ffffff', borderColor: '#c9dbed' }}>
              Ask AI Task Tutor →
            </Link>
          </div>

          {/* Task Instructions & Deliverables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#FAF8F1', border: '1px solid #E3E7E1', padding: '18px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#29332B', marginBottom: '8px' }}>
                Objective & Instructions
              </h4>
              <p style={{ fontSize: '13px', color: '#69746B', marginBottom: '12px' }}>
                <strong>Objective:</strong> {currentTask.taskTemplate.learningObjective}
              </p>
              <div style={{ fontSize: '13px', color: '#29332B', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {currentTask.taskTemplate.instructions}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #E3E7E1', padding: '18px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#29332B', marginBottom: '8px' }}>
                Deliverables & Passing Criteria
              </h4>
              <p style={{ fontSize: '13px', color: '#69746B', marginBottom: '8px' }}>
                <strong>Expected Deliverables:</strong> {currentTask.taskTemplate.expectedDeliverables}
              </p>
              <p style={{ fontSize: '13px', color: '#15803D', fontWeight: 600, marginBottom: '12px' }}>
                <strong>Passing Criteria:</strong> {currentTask.taskTemplate.passingCriteria}
              </p>
              <p style={{ fontSize: '12px', color: '#69746B' }}>
                <strong>Allowed Formats:</strong> <code>{currentTask.taskTemplate.allowedSubmissionFormats}</code>
              </p>
            </div>
          </div>

          {/* Previous Submissions & Review History */}
          {currentTask.submissions.length > 0 && (
            <div style={{ marginBottom: '24px', borderTop: '1px solid #E3E7E1', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#29332B', marginBottom: '14px' }}>
                Submission History & Review Results ({currentTask.submissions.length} attempt{currentTask.submissions.length > 1 ? 's' : ''})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {currentTask.submissions.map((sub) => {
                  const review = sub.reviews[0];
                  return (
                    <div
                      key={sub.id}
                      style={{
                        border: '1px solid #E3E7E1',
                        borderRadius: '10px',
                        padding: '16px',
                        backgroundColor: '#FAF8F1',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong>Attempt {sub.attemptNumber}</strong>
                          <span style={{ fontSize: '12px', color: '#69746B', marginLeft: '8px' }}>
                            {new Date(sub.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {review && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: review.overallScore >= internship.passingScore ? '#15803D' : '#B42318' }}>
                              Score: {review.overallScore}/100
                            </span>
                            <span
                              className={`badge ${
                                review.status === 'PASSED'
                                  ? 'badge-success'
                                  : review.status === 'REVISION_REQUESTED'
                                  ? 'badge-warning'
                                  : 'badge-danger'
                              }`}
                            >
                              {review.status}
                            </span>
                          </div>
                        )}
                      </div>

                      {sub.textContent && (
                        <div style={{ fontSize: '12px', color: '#29332B', marginBottom: '6px' }}>
                          <strong>Text Submission:</strong> {sub.textContent}
                        </div>
                      )}

                      {sub.fileName && (
                        <div style={{ fontSize: '12px', color: '#69746B', marginBottom: '6px' }}>
                          <strong>Uploaded File:</strong> <code>{sub.fileName}</code>
                        </div>
                      )}

                      {review && (
                        <div style={{ marginTop: '10px', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #E3E7E1', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600, color: '#29332B', marginBottom: '4px' }}>
                            Review Feedback ({review.reviewerType}):
                          </div>
                          <div style={{ color: '#29332B', lineHeight: 1.5 }}>{review.suggestions}</div>
                          {review.adminNotes && (
                            <div style={{ fontSize: '12px', color: '#1e3a5f', marginTop: '6px' }}>
                              <strong>Admin Notes:</strong> {review.adminNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submission Form */}
          <div style={{ borderTop: '2px solid #B8D8B0', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#29332B', marginBottom: '6px' }}>
              Submit Your Work for Evaluation
            </h4>
            <p style={{ fontSize: '13px', color: '#69746B', marginBottom: '16px' }}>
              Enter your answer text, provide a public project link (e.g. GitHub/replit), or upload your code/document.
              Attempts used: {currentTask.attemptsCount} / {internship.maxRevisionAttempts}
            </p>

            {submitFeedback && (
              <div
                className={`alert-banner ${
                  submitFeedback.type === 'error'
                    ? 'alert-danger'
                    : submitFeedback.type === 'warning'
                    ? 'alert-warning'
                    : 'alert-success'
                }`}
                style={{ marginBottom: '16px' }}
              >
                <span>{submitFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWork}>
              <div className="form-group">
                <label className="form-label">Written Explanation / Code Snippet / Summary</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Explain how you implemented the task, key design choices, and how to verify your results..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Project / Git Repository Link (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload File (Supported: py, ipynb, zip, pdf, docx, txt)</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="form-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || (!textContent.trim() && !projectUrl.trim() && !file)}
                className="btn btn-primary"
              >
                <Upload size={16} />
                <span>{submitting ? 'Submitting & Evaluating...' : 'Submit Assignment for AI Review'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Completed Milestones List */}
      {completedTasks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Completed Milestones ({completedTasks.length})</div>
              <div className="card-subtitle">Tasks reviewed and approved</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#ffffff',
                  border: '1px solid #E3E7E1',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={18} color="#15803D" />
                  <div>
                    <strong style={{ fontSize: '14px', color: '#29332B' }}>
                      Task {task.sequenceOrder}: {task.title}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#69746B' }}>
                      Completed on {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success">PASSED</span>
                  {task.finalScore !== null && (
                    <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                      Score: {task.finalScore}/100
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones List */}
      {upcomingTasks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Upcoming Tasks in Curriculum ({upcomingTasks.length})</div>
              <div className="card-subtitle">
                Will be unlocked upon successful completion of your current task
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#FAF8F1',
                  border: '1px solid #E3E7E1',
                  borderRadius: '8px',
                  opacity: 0.85,
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#29332B' }}>
                    Seq {task.sequenceOrder}: {task.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#69746B' }}>
                    Topic: {task.topic} • Duration: ~{task.suggestedDurationDays} days
                  </div>
                </div>
                <span className="badge badge-neutral">Locked</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

