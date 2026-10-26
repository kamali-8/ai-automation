'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CheckSquare,
  TrendingUp,
  Mail,
  LogOut,
  RefreshCw,
  Cpu,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; selectedModel: string } | null>(null);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [schedulerMsg, setSchedulerMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check session
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/login?role=admin');
        } else {
          setAdminUser(data.user);
        }
      })
      .catch(() => router.push('/login?role=admin'));

    // Check Ollama status
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => setOllamaStatus(data))
      .catch(() => setOllamaStatus({ available: false, selectedModel: 'qwen2.5:latest' }));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleTriggerScheduler() {
    setRunningScheduler(true);
    setSchedulerMsg(null);
    try {
      const res = await fetch('/api/admin/scheduler', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSchedulerMsg(data.message);
        setTimeout(() => setSchedulerMsg(null), 6000);
      } else {
        setSchedulerMsg(`Error: ${data.error}`);
      }
    } catch {
      setSchedulerMsg('Scheduler execution error.');
    } finally {
      setRunningScheduler(false);
    }
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Intern Management', href: '/admin/interns', icon: Users },
    { label: 'Syllabus & Documents', href: '/admin/syllabus', icon: BookOpen },
    { label: 'Task Management', href: '/admin/tasks', icon: CheckSquare },
    { label: 'Progress & Reviews', href: '/admin/progress', icon: TrendingUp },
    { label: 'Email Outbox', href: '/admin/outbox', icon: Mail },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/admin">
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#29332B', lineHeight: 1.2 }}>
              Intern Management
            </h2>
            <div className="brand-badge">Automation Platform</div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Engine Status in Sidebar */}
        <div style={{ padding: '16px', margin: '12px', background: '#FAF8F1', borderRadius: '10px', border: '1px solid #E3E7E1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Cpu size={15} color="#29332B" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#29332B' }}>Ollama AI Engine</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: ollamaStatus?.available ? '#16a34a' : '#ea580c',
              }}
            />
            <span style={{ fontSize: '12px', color: '#69746B' }}>
              {ollamaStatus?.available ? `Online (${ollamaStatus.selectedModel})` : 'Offline / Standby'}
            </span>
          </div>
        </div>

        {/* User Info & Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E3E7E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#29332B' }}>
              {adminUser?.name || 'Administrator'}
            </div>
            <div style={{ fontSize: '11px', color: '#69746B' }}>admin@gmail.com</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B', padding: '6px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <span style={{ fontSize: '13px', color: '#69746B' }}>Administrator Workspace</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {schedulerMsg && (
              <span style={{ fontSize: '12px', color: '#15803D', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
                {schedulerMsg}
              </span>
            )}
            <button
              onClick={handleTriggerScheduler}
              disabled={runningScheduler}
              className="btn btn-secondary btn-sm"
              title="Run schedule evaluation to check deadlines, dispatch reminders, and update overdue tasks."
            >
              <RefreshCw size={14} className={runningScheduler ? 'animate-spin' : ''} />
              <span>{runningScheduler ? 'Evaluating...' : 'Run Scheduler Now'}</span>
            </button>

            <Link href="/intern" className="btn btn-pastel-blue btn-sm" target="_blank" title="Open Intern Portal in new tab">
              Preview Intern Portal ↗
            </Link>
          </div>
        </header>

        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

