'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquareCode,
  Mail,
  LogOut,
  GraduationCap,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function InternLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [internUser, setInternUser] = useState<{
    id: string;
    name: string;
    email: string;
    domainName?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== 'INTERN') {
          router.push('/login?role=intern');
        } else {
          setInternUser(data.user);
        }
      })
      .catch(() => router.push('/login?role=intern'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const navItems = [
    { label: 'My Internship', href: '/intern', icon: LayoutDashboard },
    { label: 'AI Task Tutor', href: '/intern/chat', icon: MessageSquareCode },
    { label: 'My Notifications', href: '/intern/outbox', icon: Mail },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/intern">
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#29332B', lineHeight: 1.2 }}>
              Intern Portal
            </h2>
            <div className="brand-badge" style={{ backgroundColor: '#E2ECF8' }}>
              {internUser?.domainName || 'Self-Paced Learning'}
            </div>
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

        {/* AI Assistant Help Card in Sidebar */}
        <div style={{ padding: '16px', margin: '12px', background: '#DCEBD7', borderRadius: '10px', border: '1px solid #B8D8B0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={16} color="#15803D" />
            <strong style={{ fontSize: '12px', color: '#1a4d2e' }}>AI Task Mentor</strong>
          </div>
          <p style={{ fontSize: '11px', color: '#29332B', lineHeight: 1.4, margin: '4px 0 8px' }}>
            Stuck on instructions? Ask the AI Tutor to break down your task into simple steps.
          </p>
          <Link href="/intern/chat" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '11px', padding: '5px' }}>
            Chat with Mentor →
          </Link>
        </div>

        {/* User Info & Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E3E7E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#29332B' }}>
              {internUser?.name || 'Intern'}
            </div>
            <div style={{ fontSize: '11px', color: '#69746B' }}>{internUser?.email}</div>
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
            <span style={{ fontSize: '13px', color: '#69746B' }}>
              Domain: <strong>{internUser?.domainName || 'Loading...'}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/admin" className="btn btn-secondary btn-sm" title="Switch to Admin Dashboard">
              Admin Dashboard ↗
            </Link>
          </div>
        </header>

        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

