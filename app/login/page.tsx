'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'ADMIN' : 'INTERN';

  const [role, setRole] = useState<'ADMIN' | 'INTERN'>(initialRole);
  // Admin fields
  const [adminEmail, setAdminEmail] = useState('admin@gmail.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  // Intern fields
  const [internName, setInternName] = useState('Alice Johnson');
  const [internEmail, setInternEmail] = useState('alice@example.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('role') === 'admin') {
      setRole('ADMIN');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        role === 'ADMIN'
          ? { role: 'ADMIN', email: adminEmail, password: adminPassword }
          : { role: 'INTERN', name: internName, email: internEmail };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/intern');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function setDemoAccount(type: 'admin' | 'alice' | 'bob') {
    setError(null);
    if (type === 'admin') {
      setRole('ADMIN');
      setAdminEmail('admin@gmail.com');
      setAdminPassword('admin123');
    } else if (type === 'alice') {
      setRole('INTERN');
      setInternName('Alice Johnson');
      setInternEmail('alice@example.com');
    } else if (type === 'bob') {
      setRole('INTERN');
      setInternName('Bob Smith');
      setInternEmail('bob@example.com');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ fontSize: '12px', color: '#69746B', display: 'inline-block', marginBottom: '8px' }}>
            ← Back to Home
          </Link>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#29332B' }}>Sign In</h2>
          <p style={{ fontSize: '13px', color: '#69746B', marginTop: '4px' }}>
            Intern Management Automation Demo
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#FAF8F1', padding: '4px', borderRadius: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setRole('ADMIN'); setError(null); }}
            className={`btn btn-sm ${role === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', boxShadow: role === 'ADMIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Administrator
          </button>
          <button
            type="button"
            onClick={() => { setRole('INTERN'); setError(null); }}
            className={`btn btn-sm ${role === 'INTERN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', boxShadow: role === 'INTERN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Intern Portal
          </button>
        </div>

        {error && (
          <div className="alert-banner alert-danger" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
          </div>
        )}

        {role === 'INTERN' && (
          <div className="alert-banner alert-info" style={{ marginBottom: '16px', fontSize: '12px' }}>
            <span><strong>Demo Mode:</strong> Interns log in with their registered Name and Email imported from the Excel roster.</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {role === 'ADMIN' ? (
            <>
              <div className="form-group">
                <label className="form-label">Admin Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={internName}
                  onChange={(e) => setInternName(e.target.value)}
                  placeholder="Alice Johnson"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registered Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={internEmail}
                  onChange={(e) => setInternEmail(e.target.value)}
                  placeholder="alice@example.com"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Authenticating...' : role === 'ADMIN' ? 'Sign In as Admin' : 'Sign In as Intern'}
          </button>
        </form>

        {/* Quick Demo Pre-fills */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E3E7E1' }}>
          <p style={{ fontSize: '12px', color: '#69746B', marginBottom: '8px', fontWeight: 600 }}>
            Quick Demo Autofill:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setDemoAccount('admin')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              Admin (admin@gmail.com)
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('alice')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              Alice (Python Intern)
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('bob')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              Bob (Data Science)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}

