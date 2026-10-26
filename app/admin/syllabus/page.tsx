'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  X,
  File,
} from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  totalDurationWeeks: number;
  defaultTaskDurationDays: number;
  passingScore: number;
  maxRevisionAttempts: number;
  passingRequiredForNext: boolean;
  allowedSubmissionFormats: string;
}

interface LearningMaterial {
  id: string;
  domainId: string;
  domain: { name: string };
  title: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
  extractionStatus: string;
  errorMessage: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SyllabusManagementPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview modal
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null);

  // Domain Config Edit Modal
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [savingDomain, setSavingDomain] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resDomains, resMaterials] = await Promise.all([
        fetch('/api/admin/domains'),
        fetch('/api/admin/materials'),
      ]);
      const dataDomains = await resDomains.json();
      const dataMaterials = await resMaterials.json();

      setDomains(dataDomains.domains || []);
      setMaterials(dataMaterials.materials || []);
      if (dataDomains.domains?.length > 0 && !selectedDomainId) {
        setSelectedDomainId(dataDomains.domains[0].id);
      }
    } catch (err) {
      console.error('Error loading syllabus data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDomainId) return;

    setUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('domainId', selectedDomainId);
    if (title) formData.append('title', title);
    if (file) formData.append('file', file);
    if (rawText) formData.append('rawText', rawText);

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload material');

      setUploadMessage({
        type: 'success',
        text: `Material "${data.material.title}" processed. Extraction status: ${data.material.extractionStatus}`,
      });
      setTitle('');
      setFile(null);
      setRawText('');
      loadData();
    } catch (err: unknown) {
      setUploadMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(materialId: string, currentActive: boolean) {
    try {
      await fetch('/api/admin/materials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: materialId, isActive: !currentActive }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  async function handleSaveDomainConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDomain) return;

    setSavingDomain(true);
    try {
      const res = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDomain),
      });
      if (res.ok) {
        setEditingDomain(null);
        loadData();
      }
    } catch (err) {
      console.error('Failed to save domain:', err);
    } finally {
      setSavingDomain(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#29332B' }}>Syllabus & Documents</h1>
        <p style={{ fontSize: '14px', color: '#69746B', marginTop: '4px' }}>
          Upload learning materials by domain, parse text from PDF/Word/Spreadsheets, and configure internship rules.
        </p>
      </div>

      {/* Upload Material Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upload Learning Material / Syllabus</div>
            <div className="card-subtitle">
              Supported formats: PDF (.pdf), Word (.docx), Excel/CSV (.xlsx, .csv), Markdown (.md), Text (.txt).
            </div>
          </div>
        </div>

        {uploadMessage && (
          <div
            className={`alert-banner ${uploadMessage.type === 'error' ? 'alert-danger' : 'alert-success'}`}
          >
            <span>{uploadMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Target Domain</label>
              <select
                className="form-select"
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                required
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Document Title (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Python Core Curriculum v2"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* File Upload Option */}
            <div style={{ border: '1px dashed #B8D8B0', padding: '18px', borderRadius: '10px', background: '#FAF8F1' }}>
              <label className="form-label">Option A: Upload Document File</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="form-input"
              />
              <p style={{ fontSize: '11px', color: '#69746B', marginTop: '6px' }}>
                Files are stored privately in <code>uploads/</code> outside webroot.
              </p>
            </div>

            {/* Direct Text Option */}
            <div style={{ border: '1px dashed #E2ECF8', padding: '18px', borderRadius: '10px', background: '#FAF8F1' }}>
              <label className="form-label">Option B: Or Enter / Paste Plain Text</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste curriculum notes, topics, or markdown syllabus directly..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || (!file && !rawText.trim())}
          >
            <Upload size={16} />
            <span>{uploading ? 'Extracting & Saving...' : 'Extract & Save Learning Material'}</span>
          </button>
        </form>
      </div>

      {/* Materials List Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Stored Learning Materials ({materials.length})</div>
            <div className="card-subtitle">Extracted text used by the AI task planner and intern chatbot mentor</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>Loading materials...</div>
        ) : materials.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>
            No materials uploaded yet. Upload a syllabus document above.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Domain</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Extraction Status</th>
                  <th>Active in AI</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.title}</strong>
                      <div style={{ fontSize: '11px', color: '#69746B' }}>{m.originalFilename}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{m.domain.name}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                        {m.fileType}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#69746B' }}>
                      {Math.round(m.fileSize / 1024)} KB
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.extractionStatus === 'SUCCESS'
                            ? 'badge-success'
                            : m.extractionStatus === 'UNSUPPORTED'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {m.extractionStatus}
                      </span>
                      {m.errorMessage && (
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                          {m.errorMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(m.id, m.isActive)}
                        className={`btn btn-sm ${m.isActive ? 'btn-pastel-blue' : 'btn-secondary'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {m.isActive ? 'Active (Included)' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => setPreviewMaterial(m)}
                        className="btn btn-secondary btn-sm"
                        disabled={!m.extractedText}
                      >
                        <Eye size={13} />
                        <span>View Text</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Internship Configuration Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Internship Domain Rules & Policies</div>
            <div className="card-subtitle">
              Configure duration, passing thresholds, revision limits, and progression requirements
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Total Duration</th>
                <th>Task Duration</th>
                <th>Passing Threshold</th>
                <th>Max Revisions</th>
                <th>Progression Rule</th>
                <th>Allowed Formats</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.totalDurationWeeks} weeks</td>
                  <td>{d.defaultTaskDurationDays} days / task</td>
                  <td>
                    <span className="badge badge-success">{d.passingScore}% minimum</span>
                  </td>
                  <td>{d.maxRevisionAttempts} attempts</td>
                  <td>
                    <span className="badge badge-neutral">
                      {d.passingRequiredForNext ? 'Passing Required' : 'Open Progression'}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#69746B', maxWidth: '160px' }}>
                    {d.allowedSubmissionFormats}
                  </td>
                  <td>
                    <button
                      onClick={() => setEditingDomain(d)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Settings size={13} />
                      <span>Configure</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Extracted Text Modal */}
      {previewMaterial && (
        <div className="modal-overlay" onClick={() => setPreviewMaterial(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                  Extracted Content: {previewMaterial.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#69746B' }}>
                  {previewMaterial.domain.name} • {previewMaterial.originalFilename}
                </div>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            <pre
              style={{
                background: '#FAF8F1',
                padding: '16px',
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#29332B',
                border: '1px solid #E3E7E1',
              }}
            >
              {previewMaterial.extractedText || 'No text extracted.'}
            </pre>
          </div>
        </div>
      )}

      {/* Edit Domain Config Modal */}
      {editingDomain && (
        <div className="modal-overlay" onClick={() => setEditingDomain(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                Configure {editingDomain.name} Rules
              </h3>
              <button
                onClick={() => setEditingDomain(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDomainConfig}>
              <div className="form-group">
                <label className="form-label">Total Internship Duration (Weeks)</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  className="form-input"
                  value={editingDomain.totalDurationWeeks}
                  onChange={(e) => setEditingDomain({ ...editingDomain, totalDurationWeeks: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Task Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="form-input"
                  value={editingDomain.defaultTaskDurationDays}
                  onChange={(e) => setEditingDomain({ ...editingDomain, defaultTaskDurationDays: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Passing Score Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  value={editingDomain.passingScore}
                  onChange={(e) => setEditingDomain({ ...editingDomain, passingScore: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Allowed Revision Attempts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="form-input"
                  value={editingDomain.maxRevisionAttempts}
                  onChange={(e) => setEditingDomain({ ...editingDomain, maxRevisionAttempts: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allowed Submission Formats (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingDomain.allowedSubmissionFormats}
                  onChange={(e) => setEditingDomain({ ...editingDomain, allowedSubmissionFormats: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="passingRequired"
                  checked={editingDomain.passingRequiredForNext}
                  onChange={(e) => setEditingDomain({ ...editingDomain, passingRequiredForNext: e.target.checked })}
                />
                <label htmlFor="passingRequired" style={{ fontSize: '13px', fontWeight: 600, color: '#29332B' }}>
                  Require passing grade before assigning next task sequence
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setEditingDomain(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDomain}
                  className="btn btn-primary btn-sm"
                >
                  {savingDomain ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

