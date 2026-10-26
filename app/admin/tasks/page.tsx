'use client';

import { useState, useEffect } from 'react';
import {
  ListTodo,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface Domain {
  id: string;
  name: string;
}

interface TaskTemplate {
  id: string;
  domainId: string;
  domain: { name: string };
  sequenceOrder: number;
  title: string;
  topic: string;
  learningObjective: string;
  instructions: string;
  expectedDeliverables: string;
  difficulty: string;
  suggestedDurationDays: number;
  deadlineRules: string | null;
  evaluationRubric: string;
  passingCriteria: string;
  allowedSubmissionFormats: string;
  status: string;
  _count?: { assignments: number };
}

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // AI Task Generation Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDomainId, setAiDomainId] = useState('');
  const [taskCount, setTaskCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; error?: string } | null>(null);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual Task Creation Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    domainId: '',
    title: '',
    topic: '',
    learningObjective: '',
    instructions: '',
    expectedDeliverables: '',
    difficulty: 'BEGINNER',
    suggestedDurationDays: 3,
    deadlineRules: 'Due within 3 calendar days of assignment',
    evaluationRubric: JSON.stringify([
      { criterion: 'Implementation correctness', points: 50, description: 'Meets functional requirements' },
      { criterion: 'Code quality & structure', points: 30, description: 'Clean, documented, organized' },
      { criterion: 'Deliverables & verification', points: 20, description: 'All artifacts provided' },
    ], null, 2),
    passingCriteria: 'Score >= 70% and all mandatory items fulfilled',
    allowedSubmissionFormats: 'text,zip,pdf,py,js,ts,ipynb,docx',
    sequenceOrder: 1,
  });
  const [savingManual, setSavingManual] = useState(false);

  // Inspector Modal
  const [inspectTask, setInspectTask] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    loadData();
    checkAi();
  }, []);

  async function checkAi() {
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      setAiStatus(data);
    } catch {
      setAiStatus({ available: false, error: 'Ollama unreachable' });
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [resTasks, resDomains] = await Promise.all([
        fetch('/api/admin/tasks'),
        fetch('/api/admin/domains'),
      ]);
      const dataTasks = await resTasks.json();
      const dataDomains = await resDomains.json();

      setTasks(dataTasks.tasks || []);
      setDomains(dataDomains.domains || []);

      if (dataDomains.domains?.length > 0 && !aiDomainId) {
        setAiDomainId(dataDomains.domains[0].id);
        setManualForm((prev) => ({ ...prev, domainId: dataDomains.domains[0].id }));
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveTask(taskId: string) {
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', taskId, status: 'APPROVED' }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  }

  async function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setAiMessage(null);

    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_generate',
          domainId: aiDomainId,
          count: taskCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      setAiMessage({
        type: 'success',
        text: data.message || `Created ${data.tasks.length} task drafts. Approve them to activate.`,
      });
      loadData();
    } catch (err: unknown) {
      setAiMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingManual(true);
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          action: 'manual',
          sequenceOrder: Number(manualForm.sequenceOrder),
          suggestedDurationDays: Number(manualForm.suggestedDurationDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      setShowManualModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating task');
    } finally {
      setSavingManual(false);
    }
  }

  const filteredTasks = selectedDomainId
    ? tasks.filter((t) => t.domainId === selectedDomainId)
    : tasks;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#29332B' }}>Task Plan Management</h1>
          <p style={{ fontSize: '14px', color: '#69746B', marginTop: '4px' }}>
            Curate domain-specific task blueprints, generate milestones with AI using syllabus text, or create manual tasks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setShowAiModal(true); checkAi(); setAiMessage(null); }}
            className="btn btn-primary btn-sm"
          >
            <Sparkles size={15} />
            <span>AI Task Planner</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <PlusCircle size={15} />
            <span>Manual Task Creator</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#29332B' }}>Filter by Domain:</span>
          <button
            onClick={() => setSelectedDomainId('')}
            className={`btn btn-sm ${!selectedDomainId ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Domains ({tasks.length})
          </button>
          {domains.map((d) => {
            const count = tasks.filter((t) => t.domainId === d.id).length;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDomainId(d.id)}
                className={`btn btn-sm ${selectedDomainId === d.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {d.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Configured Tasks ({filteredTasks.length})</div>
            <div className="card-subtitle">
              Draft tasks require approval before being assigned to interns.
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>
            No tasks found. Use the AI Task Planner or Manual Task Creator above.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Task Title</th>
                  <th>Domain & Topic</th>
                  <th>Difficulty</th>
                  <th>Suggested Duration</th>
                  <th>Status</th>
                  <th>Active Assignments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                        Seq {task.sequenceOrder}
                      </span>
                    </td>
                    <td>
                      <strong>{task.title}</strong>
                      <div style={{ fontSize: '11px', color: '#69746B', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.learningObjective}
                      </div>
                    </td>
                    <td>
                      <div><strong>{task.domain.name}</strong></div>
                      <div style={{ fontSize: '11px', color: '#69746B' }}>{task.topic}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{task.difficulty}</span>
                    </td>
                    <td>{task.suggestedDurationDays} days</td>
                    <td>
                      <span
                        className={`badge ${
                          task.status === 'APPROVED' ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>{task._count?.assignments || 0} interns</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {task.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApproveTask(task.id)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            title="Approve and activate this draft task"
                          >
                            <CheckCircle2 size={12} />
                            <span>Approve</span>
                          </button>
                        )}
                        <button
                          onClick={() => setInspectTask(task)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Task Generation Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#29332B" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                  AI Task Generation (Ollama Qwen)
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ollama Status Alert */}
            {aiStatus && !aiStatus.available && (
              <div className="alert-banner alert-warning" style={{ marginBottom: '16px' }}>
                <div>
                  <strong>Ollama Service is Offline:</strong>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Ensure Ollama is running locally: <code>ollama serve</code> and <code>ollama run qwen2.5</code>.
                    You can retry below, or use the <strong>Manual Task Creator</strong> as fallback.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={checkAi}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <RefreshCw size={12} />
                  <span>Retry Connection</span>
                </button>
              </div>
            )}

            {aiStatus && aiStatus.available && (
              <div className="alert-banner alert-info" style={{ marginBottom: '16px', fontSize: '12px' }}>
                <span>Connected to local Ollama. Tasks will be generated from uploaded syllabus text and saved as <strong>DRAFTS</strong> for your review and approval.</span>
              </div>
            )}

            {aiMessage && (
              <div
                className={`alert-banner ${aiMessage.type === 'error' ? 'alert-danger' : 'alert-success'}`}
                style={{ marginBottom: '16px' }}
              >
                <span>{aiMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAiGenerate}>
              <div className="form-group">
                <label className="form-label">Select Domain</label>
                <select
                  className="form-select"
                  value={aiDomainId}
                  onChange={(e) => setAiDomainId(e.target.value)}
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
                <label className="form-label">Number of Sequential Tasks</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="form-input"
                  value={taskCount}
                  onChange={(e) => setTaskCount(Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={generating || (aiStatus !== null && !aiStatus.available)}
                  className="btn btn-primary btn-sm"
                >
                  <Sparkles size={14} />
                  <span>{generating ? 'Generating Task Blueprint...' : 'Generate Task Drafts'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Task Creator Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                Manual Task Definition Fallback
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Domain</label>
                  <select
                    className="form-select"
                    value={manualForm.domainId}
                    onChange={(e) => setManualForm({ ...manualForm, domainId: e.target.value })}
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
                  <label className="form-label">Sequence Order</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={manualForm.sequenceOrder}
                    onChange={(e) => setManualForm({ ...manualForm, sequenceOrder: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  placeholder="e.g. Task 1: Building a Command-Line File Parser"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Topic</label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualForm.topic}
                    onChange={(e) => setManualForm({ ...manualForm, topic: e.target.value })}
                    placeholder="e.g. Modular Architecture & File I/O"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={manualForm.difficulty}
                    onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Learning Objective</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={manualForm.learningObjective}
                  onChange={(e) => setManualForm({ ...manualForm, learningObjective: e.target.value })}
                  placeholder="What knowledge or skills the intern will gain..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={manualForm.instructions}
                  onChange={(e) => setManualForm({ ...manualForm, instructions: e.target.value })}
                  placeholder="Step-by-step instructions..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Deliverables</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualForm.expectedDeliverables}
                  onChange={(e) => setManualForm({ ...manualForm, expectedDeliverables: e.target.value })}
                  placeholder="e.g. Python source file and brief README with execution sample"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Rubric (JSON array of criteria with points)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={manualForm.evaluationRubric}
                  onChange={(e) => setManualForm({ ...manualForm, evaluationRubric: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Suggested Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={manualForm.suggestedDurationDays}
                    onChange={(e) => setManualForm({ ...manualForm, suggestedDurationDays: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Passing Criteria</label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualForm.passingCriteria}
                    onChange={(e) => setManualForm({ ...manualForm, passingCriteria: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="btn btn-primary btn-sm"
                >
                  {savingManual ? 'Saving...' : 'Save & Approve Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Task Modal */}
      {inspectTask && (
        <div className="modal-overlay" onClick={() => setInspectTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '4px' }}>
                  {inspectTask.domain.name} • Sequence {inspectTask.sequenceOrder}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                  {inspectTask.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <strong>Learning Objective:</strong>
                <p style={{ color: '#69746B', marginTop: '2px' }}>{inspectTask.learningObjective}</p>
              </div>

              <div>
                <strong>Instructions:</strong>
                <p style={{ color: '#29332B', marginTop: '2px', whiteSpace: 'pre-line' }}>{inspectTask.instructions}</p>
              </div>

              <div>
                <strong>Expected Deliverables:</strong>
                <p style={{ color: '#69746B', marginTop: '2px' }}>{inspectTask.expectedDeliverables}</p>
              </div>

              <div>
                <strong>Passing Criteria:</strong>
                <p style={{ color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>{inspectTask.passingCriteria}</p>
              </div>

              <div>
                <strong>Evaluation Rubric:</strong>
                <pre style={{ background: '#FAF8F1', padding: '12px', borderRadius: '8px', border: '1px solid #E3E7E1', fontSize: '12px', marginTop: '4px', overflowX: 'auto' }}>
                  {inspectTask.evaluationRubric}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

