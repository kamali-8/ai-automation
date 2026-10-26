'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Award,
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Mail,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';

interface Metrics {
  totalInterns: number;
  activeInterns: number;
  completedInternships: number;
  tasksAssigned: number;
  pendingSubmissions: number;
  reviewsCompleted: number;
  overdueTasks: number;
}

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  actorRole: string;
  createdAt: string;
  details: string | null;
}

interface EmailItem {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  emailType: string;
  createdAt: string;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load overview data');
        return res.json();
      })
      .then((data) => {
        setMetrics(data.metrics);
        setActivities(data.recentActivity || []);
        setEmails(data.recentEmails || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#69746B' }}>Loading overview data...</div>;
  }

  if (error || !metrics) {
    return (
      <div className="alert-banner alert-danger">
        <span>Error: {error || 'Could not load metrics'}</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Interns', value: metrics.totalInterns, icon: Users, color: '#E2ECF8' },
    { label: 'Active Interns', value: metrics.activeInterns, icon: UserCheck, color: '#DCEBD7' },
    { label: 'Completed Internships', value: metrics.completedInternships, icon: Award, color: '#E9E2F5' },
    { label: 'Tasks Assigned', value: metrics.tasksAssigned, icon: ListTodo, color: '#FAF8F1' },
    { label: 'Pending Submissions', value: metrics.pendingSubmissions, icon: Clock, color: '#FEF0C7' },
    { label: 'Reviews Completed', value: metrics.reviewsCompleted, icon: CheckCircle2, color: '#DCFCE7' },
    { label: 'Overdue Tasks', value: metrics.overdueTasks, icon: AlertTriangle, color: '#FEE8E8' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#29332B' }}>Program Overview</h1>
        <p style={{ fontSize: '14px', color: '#69746B', marginTop: '4px' }}>
          Real-time metrics for internship schedules, task distribution, AI evaluations, and email dispatches.
        </p>
      </div>

      {/* Primary Stat Grid */}
      <div className="grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">{stat.label}</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: stat.color }}>
                  <Icon size={18} color="#29332B" />
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Banner */}
      <div className="card" style={{ background: '#FAF8F1', border: '1px solid #E3E7E1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#29332B' }}>Quick Workflow Operations</h3>
            <p style={{ fontSize: '13px', color: '#69746B' }}>
              Import interns, upload learning materials, or trigger AI task sequence generation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin/interns" className="btn btn-primary btn-sm">
              <FileSpreadsheet size={15} />
              <span>Import Excel Roster</span>
            </Link>
            <Link href="/admin/syllabus" className="btn btn-pastel-blue btn-sm">
              <BookOpen size={15} />
              <span>Upload Syllabus</span>
            </Link>
            <Link href="/admin/tasks" className="btn btn-pastel-lavender btn-sm">
              <ListTodo size={15} />
              <span>Task Planner</span>
            </Link>
            <Link href="/admin/outbox" className="btn btn-secondary btn-sm">
              <Mail size={15} />
              <span>Simulated Outbox</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity & Email Outbox Side-by-Side */}
      <div className="grid-cols-2">
        {/* Recent Activity Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity Logs</div>
              <div className="card-subtitle">Automated system events and administrator actions</div>
            </div>
          </div>

          {activities.length === 0 ? (
            <div style={{ color: '#69746B', fontSize: '13px', padding: '12px 0' }}>No activity logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#FAF8F1',
                    borderRadius: '8px',
                    border: '1px solid #E3E7E1',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <strong style={{ color: '#29332B' }}>{act.action}</strong>
                    <div style={{ fontSize: '11px', color: '#69746B' }}>
                      {act.entityType} • Actor: {act.actorRole}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#69746B' }}>
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Simulated Emails Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Simulated Emails</div>
              <div className="card-subtitle">Local outbox entries (no external SMTP used)</div>
            </div>
            <Link href="/admin/outbox" style={{ fontSize: '13px', color: '#29332B', fontWeight: 600 }}>
              View all →
            </Link>
          </div>

          {emails.length === 0 ? (
            <div style={{ color: '#69746B', fontSize: '13px', padding: '12px 0' }}>No simulated emails yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {emails.map((email) => (
                <div
                  key={email.id}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #E3E7E1',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      {email.emailType}
                    </span>
                    <span style={{ fontSize: '11px', color: '#69746B' }}>
                      {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#29332B' }}>{email.subject}</div>
                  <div style={{ fontSize: '12px', color: '#69746B', marginTop: '2px' }}>
                    To: {email.recipientName} ({email.recipientEmail})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

