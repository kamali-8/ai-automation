import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '780px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 14px', background: '#E9E2F5', borderRadius: '16px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', color: '#29332B' }}>
          LOCAL DEMONSTRATION PLATFORM
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#29332B', marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Intern Management Automation
        </h1>
        <p style={{ fontSize: '17px', color: '#69746B', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Automating cross-domain internship schedules, AI task generation from syllabus documents,
          interactive AI mentoring, automated rubric reviews, and simulated email workflows.
        </p>

        {/* Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '36px', textAlign: 'left' }}>
          {/* Admin Card */}
          <div className="card" style={{ borderTop: '4px solid #B8D8B0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-success">Administrator</span>
              <span style={{ fontSize: '12px', color: '#69746B' }}>Full Control</span>
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Admin Dashboard</h3>
            <p style={{ fontSize: '14px', color: '#69746B', marginBottom: '20px', minHeight: '60px' }}>
              Upload syllabus materials, import Excel rosters, generate domain task plans with AI, monitor progress, inspect reviews, and view the simulated email outbox.
            </p>
            <div style={{ background: '#FAF8F1', border: '1px solid #E3E7E1', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <strong>Demo Credentials:</strong><br />
              Email: <code>admin@gmail.com</code> | Password: <code>admin123</code>
            </div>
            <Link href="/login?role=admin" className="btn btn-primary" style={{ width: '100%' }}>
              Log In as Administrator →
            </Link>
          </div>

          {/* Intern Card */}
          <div className="card" style={{ borderTop: '4px solid #E2ECF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-info">Intern</span>
              <span style={{ fontSize: '12px', color: '#69746B' }}>Self-Paced</span>
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Intern Portal</h3>
            <p style={{ fontSize: '14px', color: '#69746B', marginBottom: '20px', minHeight: '60px' }}>
              View assigned tasks and deadlines, interact with the AI task tutor, submit text/files/repos, view rubric review scores, and track internship completion.
            </p>
            <div style={{ background: '#FAF8F1', border: '1px solid #E3E7E1', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <strong>Demo Intern Account:</strong><br />
              Name: <code>Alice Johnson</code> | Email: <code>alice@example.com</code>
            </div>
            <Link href="/login?role=intern" className="btn btn-pastel-blue" style={{ width: '100%' }}>
              Log In as Intern →
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="card" style={{ textAlign: 'left', background: '#FFFFFF' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#29332B' }}>
            End-to-End Workflow Verification Steps:
          </h4>
          <ol style={{ paddingLeft: '20px', fontSize: '13px', color: '#69746B', lineHeight: 1.8 }}>
            <li><strong>Syllabus Upload:</strong> Parse PDF, DOCX, TXT, XLSX, CSV learning documents and extract text.</li>
            <li><strong>Roster Import:</strong> Upload and preview Excel spreadsheets with validation and duplicate prevention.</li>
            <li><strong>AI Task Generation:</strong> Use local Ollama Qwen model to create structured, rubric-backed task sequences.</li>
            <li><strong>Independent Schedules:</strong> Deterministic calendar deadlines calculated per intern joining date.</li>
            <li><strong>AI Task Tutor & Reviews:</strong> Interns ask questions and receive instant rubric reviews.</li>
            <li><strong>Simulated Email Outbox:</strong> All notifications (welcome, assignment, feedback, completion) captured locally in the outbox.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

