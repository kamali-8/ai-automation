'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Clock,
  User,
  PlusCircle,
  X,
} from 'lucide-react';

interface Intern {
  id: string;
  name: string;
  email: string;
  domain?: { id: string; name: string };
  internships: Array<{
    id: string;
    startDate: string;
    endDate: string;
    durationWeeks: number;
    status: string;
    progressPercent: number;
    assignments: Array<{
      id: string;
      title: string;
      sequenceOrder: number;
      dueDate: string;
      status: string;
      finalScore: number | null;
      attemptsCount: number;
      extensionDays: number;
    }>;
  }>;
}

interface PreviewRow {
  raw: Record<string, unknown>;
  normalized: {
    name: string;
    email: string;
    domain: string;
    startDate: string;
    durationWeeks: number;
  };
  isValid: boolean;
  errors: string[];
}

export default function InternManagementPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    rows: PreviewRow[];
  } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [extensionDays, setExtensionDays] = useState(3);
  const [applyingExtension, setApplyingExtension] = useState(false);

  useEffect(() => {
    loadInterns();
  }, []);

  async function loadInterns() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/interns');
      const data = await res.json();
      setInterns(data.interns || []);
    } catch (err) {
      console.error('Failed to load interns:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setImportStatus(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'preview');

    try {
      const res = await fetch('/api/admin/interns', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview roster');
      setPreviewData(data);
    } catch (err: unknown) {
      setImportStatus(`Preview error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleImportConfirmed() {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'import');

    try {
      const res = await fetch('/api/admin/interns', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportStatus(
        `Import complete: ${data.importedCount} interns enrolled successfully (${data.skippedCount} skipped). Welcome emails and initial tasks assigned.`
      );
      setPreviewData(null);
      setFile(null);
      loadInterns();
    } catch (err: unknown) {
      setImportStatus(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleGrantExtension(internshipId: string) {
    setApplyingExtension(true);
    try {
      const res = await fetch(`/api/admin/interns/${selectedIntern?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internshipId,
          extensionDays: Number(extensionDays),
        }),
      });
      if (res.ok) {
        await loadInterns();
        // Refresh selected intern
        const updatedRes = await fetch(`/api/admin/interns/${selectedIntern?.id}`);
        const updatedData = await updatedRes.json();
        setSelectedIntern(updatedData.intern);
      }
    } catch (err) {
      console.error('Extension error:', err);
    } finally {
      setApplyingExtension(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#29332B' }}>Intern Management</h1>
        <p style={{ fontSize: '14px', color: '#69746B', marginTop: '4px' }}>
          Upload Excel rosters, validate intern records with duplicate prevention, and manage individual schedules.
        </p>
      </div>

      {/* Excel Upload & Validation Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upload Excel Intern Roster</div>
            <div className="card-subtitle">
              Supported formats: .xlsx, .xls, .csv. Must include columns: <code>Name</code>, <code>Email</code>, <code>Domain</code>.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Sample files: sample_interns_valid.xlsx / sample_interns_invalid.xlsx
            </span>
          </div>
        </div>

        {importStatus && (
          <div
            className={`alert-banner ${importStatus.includes('error') ? 'alert-danger' : 'alert-success'}`}
            style={{ marginBottom: '20px' }}
          >
            <span>{importStatus}</span>
          </div>
        )}

        <form onSubmit={handlePreview} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="form-input"
            style={{ maxWidth: '340px' }}
          />

          <button
            type="submit"
            className="btn btn-secondary"
            disabled={!file || uploading}
          >
            <Upload size={16} />
            <span>{uploading ? 'Processing File...' : 'Preview Roster'}</span>
          </button>
        </form>

        {/* Validation Preview Table */}
        {previewData && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E3E7E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#29332B' }}>
                  Roster Validation Preview ({previewData.totalRows} rows detected)
                </h4>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <span className="badge badge-success">{previewData.validCount} Valid Records</span>
                  {previewData.invalidCount > 0 && (
                    <span className="badge badge-danger">{previewData.invalidCount} Invalid / Duplicate Records</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportConfirmed}
                  disabled={uploading || previewData.validCount === 0}
                  className="btn btn-primary btn-sm"
                >
                  <CheckCircle2 size={15} />
                  <span>Import {previewData.validCount} Valid Interns</span>
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Domain</th>
                    <th>Start Date</th>
                    <th>Validation Notes / Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: row.isValid ? '#ffffff' : '#FFF5F5' }}>
                      <td>
                        {row.isValid ? (
                          <span className="badge badge-success">Valid</span>
                        ) : (
                          <span className="badge badge-danger">Invalid</span>
                        )}
                      </td>
                      <td><strong>{row.normalized.name || '(Empty)'}</strong></td>
                      <td>{row.normalized.email || '(Empty)'}</td>
                      <td>{row.normalized.domain || '(Empty)'}</td>
                      <td>{new Date(row.normalized.startDate).toLocaleDateString()}</td>
                      <td>
                        {row.isValid ? (
                          <span style={{ color: '#16a34a', fontSize: '12px' }}>Ready for import</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>
                            {row.errors.join(' • ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Interns Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Enrolled Interns ({interns.length})</div>
            <div className="card-subtitle">All active, completed, and overdue internship schedules</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>Loading interns...</div>
        ) : interns.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>
            No interns registered yet. Upload an Excel roster above to enroll interns.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Intern Name</th>
                  <th>Email</th>
                  <th>Domain</th>
                  <th>Schedule & Dates</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Active Task</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern) => {
                  const internship = intern.internships[0];
                  const assignments = internship?.assignments || [];
                  const activeTask =
                    assignments.find((a) => ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'REVISION_REQUESTED', 'OVERDUE'].includes(a.status)) ||
                    assignments[assignments.length - 1];

                  return (
                    <tr key={intern.id}>
                      <td>
                        <strong>{intern.name}</strong>
                      </td>
                      <td style={{ color: '#69746B' }}>{intern.email}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {intern.domain?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        {internship ? (
                          <div style={{ fontSize: '12px' }}>
                            <div>{new Date(internship.startDate).toLocaleDateString()} → {new Date(internship.endDate).toLocaleDateString()}</div>
                            <span style={{ color: '#69746B' }}>({internship.durationWeeks} weeks)</span>
                          </div>
                        ) : (
                          <span style={{ color: '#69746B', fontSize: '12px' }}>No active schedule</span>
                        )}
                      </td>
                      <td>
                        {internship ? (
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
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        {internship ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                              <span>{internship.progressPercent}%</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${internship.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {activeTask ? (
                          <div style={{ fontSize: '12px' }}>
                            <div style={{ fontWeight: 500, color: '#29332B' }}>{activeTask.title}</div>
                            <span className={`badge ${activeTask.status === 'PASSED' ? 'badge-success' : activeTask.status === 'OVERDUE' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                              {activeTask.status}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#69746B', fontSize: '12px' }}>No tasks assigned</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedIntern(intern)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Eye size={13} />
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intern Detail Modal */}
      {selectedIntern && (
        <div className="modal-overlay" onClick={() => setSelectedIntern(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#29332B' }}>
                  {selectedIntern.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#69746B' }}>{selectedIntern.email}</div>
              </div>
              <button
                onClick={() => setSelectedIntern(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            {selectedIntern.internships.length === 0 ? (
              <p style={{ color: '#69746B' }}>No internship records found.</p>
            ) : (
              <div>
                {selectedIntern.internships.map((internship) => (
                  <div key={internship.id}>
                    {/* Schedule Overview */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#FAF8F1', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #E3E7E1' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#69746B' }}>Start Date</div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(internship.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#69746B' }}>Target End Date</div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(internship.endDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#69746B' }}>Current Status</div>
                        <span className="badge badge-info">{internship.status}</span>
                      </div>
                    </div>

                    {/* Deadline Extension Box */}
                    <div style={{ background: '#ffffff', border: '1px solid #E3E7E1', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Grant Deadline Extension</h4>
                      <p style={{ fontSize: '12px', color: '#69746B', marginBottom: '12px' }}>
                        Extend current task deadline by calendar days if the intern requested an approved extension.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={extensionDays}
                          onChange={(e) => setExtensionDays(Number(e.target.value))}
                          className="form-input"
                          style={{ width: '90px' }}
                        />
                        <button
                          onClick={() => handleGrantExtension(internship.id)}
                          disabled={applyingExtension}
                          className="btn btn-pastel-blue btn-sm"
                        >
                          {applyingExtension ? 'Granting...' : `+ Grant ${extensionDays} Day Extension`}
                        </button>
                      </div>
                    </div>

                    {/* Task History */}
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#29332B' }}>
                      Task Milestone History ({internship.assignments.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {internship.assignments.length === 0 ? (
                        <div style={{ color: '#69746B', fontSize: '13px' }}>No tasks assigned yet.</div>
                      ) : (
                        internship.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            style={{
                              border: '1px solid #E3E7E1',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#29332B' }}>
                                Task {assignment.sequenceOrder}: {assignment.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#69746B', marginTop: '2px' }}>
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                {assignment.extensionDays > 0 && ` (+${assignment.extensionDays} days extension)`}
                                {' • '}Attempts: {assignment.attemptsCount}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span className={`badge ${assignment.status === 'PASSED' ? 'badge-success' : assignment.status === 'OVERDUE' ? 'badge-danger' : 'badge-neutral'}`}>
                                {assignment.status}
                              </span>
                              {assignment.finalScore !== null && (
                                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                                  Score: {assignment.finalScore}/100
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

