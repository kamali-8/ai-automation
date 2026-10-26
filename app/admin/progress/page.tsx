'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  Sliders,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface ReviewItem {
  id: string;
  submissionId: string;
  assignmentId: string;
  reviewerType: string;
  overallScore: number;
  passingThreshold: number;
  status: string;
  criteriaAssessment: string;
  strengths: string;
  mistakes: string;
  evidence: string | null;
  suggestions: string;
  limitations: string | null;
  humanReviewRequired: boolean;
  adminNotes: string | null;
  isOverridden: boolean;
  reviewedAt: string;
  submission: {
    id: string;
    attemptNumber: number;
    textContent: string | null;
    projectUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    intern: {
      id: string;
      name: string;
      email: string;
    };
  };
  assignment: {
    id: string;
    title: string;
    sequenceOrder: number;
    status: string;
    dueDate: string;
    internshipId: string;
    internship: {
      id: string;
      domain: { name: string };
      intern: { name: string; email: string };
    };
  };
}

export default function ProgressMonitoringPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Override Modal
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [overrideScore, setOverrideScore] = useState(75);
  const [overrideStatus, setOverrideStatus] = useState('PASSED');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  function openOverrideModal(review: ReviewItem) {
    setSelectedReview(review);
    setOverrideScore(review.overallScore);
    setOverrideStatus(review.status);
    setAdminNotes(review.adminNotes || '');
    setOverrideMsg(null);
  }

  async function handleSaveOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReview) return;

    setSavingOverride(true);
    setOverrideMsg(null);

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          overallScore: Number(overrideScore),
          status: overrideStatus,
          adminNotes: adminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to override review');

      setOverrideMsg(
        overrideStatus === 'PASSED'
          ? 'Review overridden to PASSED. Next task assigned automatically and simulated email sent.'
          : 'Review overridden successfully.'
      );
      await loadReviews();
      setTimeout(() => setSelectedReview(null), 1800);
    } catch (err: unknown) {
      setOverrideMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingOverride(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#29332B' }}>Progress & Submission Reviews</h1>
        <p style={{ fontSize: '14px', color: '#69746B', marginTop: '4px' }}>
          Inspect intern submissions, AI evaluation rubrics, and apply administrator score/status overrides.
        </p>
      </div>

      {/* Reviews Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Evaluated Submissions ({reviews.length})</div>
            <div className="card-subtitle">
              Submissions evaluated by AI or flagged for human administrator review
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>Loading evaluations...</div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>
            No submissions evaluated yet. Interns can submit tasks from the Intern Portal.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Domain & Task</th>
                  <th>Attempt</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Evaluator</th>
                  <th>Human Review Flag</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.submission.intern.name}</strong>
                      <div style={{ fontSize: '11px', color: '#69746B' }}>{r.submission.intern.email}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ marginBottom: '2px' }}>
                        {r.assignment.internship.domain.name}
                      </span>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{r.assignment.title}</div>
                    </td>
                    <td>Attempt {r.submission.attemptNumber}</td>
                    <td>
                      <strong style={{ fontSize: '14px', color: r.overallScore >= r.passingThreshold ? '#15803D' : '#B42318' }}>
                        {r.overallScore}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#69746B' }}> / 100</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'PASSED'
                            ? 'badge-success'
                            : r.status === 'REVISION_REQUESTED'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {r.isOverridden ? 'ADMIN OVERRIDE' : r.reviewerType}
                      </span>
                    </td>
                    <td>
                      {r.humanReviewRequired ? (
                        <span className="badge badge-danger">Needs Review</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#69746B' }}>None</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#69746B' }}>
                      {new Date(r.reviewedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => openOverrideModal(r)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Sliders size={13} />
                        <span>Inspect & Override</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect & Override Modal */}
      {selectedReview && (
        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '4px' }}>
                  {selectedReview.assignment.internship.domain.name} • Task {selectedReview.assignment.sequenceOrder}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                  {selectedReview.assignment.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#69746B' }}>
                  Submitted by {selectedReview.submission.intern.name} ({selectedReview.submission.intern.email})
                </div>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            {overrideMsg && (
              <div className={`alert-banner ${overrideMsg.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                <span>{overrideMsg}</span>
              </div>
            )}

            {/* Submission Content Section */}
            <div style={{ background: '#FAF8F1', border: '1px solid #E3E7E1', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#29332B', marginBottom: '8px' }}>
                Intern's Submitted Material:
              </h4>

              {selectedReview.submission.textContent && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#69746B' }}>Text Answer:</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #E3E7E1', marginTop: '4px' }}>
                    {selectedReview.submission.textContent}
                  </pre>
                </div>
              )}

              {selectedReview.submission.projectUrl && (
                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <strong>Project Link:</strong>{' '}
                  <a href={selectedReview.submission.projectUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                    {selectedReview.submission.projectUrl}
                  </a>
                </div>
              )}

              {selectedReview.submission.fileName && (
                <div style={{ fontSize: '13px' }}>
                  <strong>Uploaded File:</strong> <code>{selectedReview.submission.fileName}</code>
                  {selectedReview.submission.fileSize && (
                    <span style={{ fontSize: '11px', color: '#69746B' }}>
                      {' '}({Math.round(selectedReview.submission.fileSize / 1024)} KB)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* AI Review Breakdown */}
            <div style={{ border: '1px solid #E3E7E1', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#29332B' }}>
                  Evaluation Feedback & Rubric:
                </h4>
                <div>
                  Score: <strong>{selectedReview.overallScore}</strong> / 100
                  {' '}(Threshold: {selectedReview.passingThreshold})
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#29332B', lineHeight: 1.6 }}>
                <div><strong>Suggestions:</strong> {selectedReview.suggestions}</div>
                {selectedReview.evidence && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#69746B' }}>
                    <strong>Evidence:</strong> {selectedReview.evidence}
                  </div>
                )}
                {selectedReview.limitations && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#69746B', fontStyle: 'italic' }}>
                    Limitations: {selectedReview.limitations}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Override Section */}
            <form onSubmit={handleSaveOverride} style={{ borderTop: '2px solid #B8D8B0', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#29332B', marginBottom: '12px' }}>
                Administrator Override
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Override Score (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Override Status</label>
                  <select
                    className="form-select"
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    required
                  >
                    <option value="PASSED">PASSED (Auto-progresses to next task)</option>
                    <option value="REVISION_REQUESTED">REVISION_REQUESTED (Allows resubmit)</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Administrator Notes / Feedback</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this review was overridden..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="btn btn-primary btn-sm"
                >
                  {savingOverride ? 'Saving Override...' : 'Apply Admin Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

