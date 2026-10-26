'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  AlertCircle,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react';

interface InternEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  emailType: string;
  simulatedStatus: string;
  createdAt: string;
}

export default function InternOutboxPage() {
  const [emails, setEmails] = useState<InternEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewEmail, setPreviewEmail] = useState<InternEmail | null>(null);

  useEffect(() => {
    fetch('/api/intern/outbox')
      .then((res) => res.json())
      .then((data) => setEmails(data.emails || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#29332B' }}>My Notifications</h1>
        <p style={{ fontSize: '13px', color: '#69746B', marginTop: '2px' }}>
          Simulated system messages dispatched to your registered email account.
        </p>
      </div>

      <div className="alert-banner alert-warning" style={{ border: '2px dashed #B8D8B0', background: '#FAF8F1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} color="#744210" />
          <span style={{ fontSize: '13px', color: '#29332B' }}>
            <strong>[ SIMULATED DEMO NOTIFICATIONS ]</strong> These messages are stored directly in your portal to demonstrate the automated email workflow without sending real emails over SMTP.
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Received Messages ({emails.length})</div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>Loading messages...</div>
        ) : emails.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#69746B' }}>
            No simulated emails found yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {emails.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: '#ffffff',
                  border: '1px solid #E3E7E1',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {e.emailType}
                    </span>
                    <span style={{ fontSize: '12px', color: '#69746B' }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <strong style={{ fontSize: '14px', color: '#29332B' }}>{e.subject}</strong>
                </div>

                <button
                  onClick={() => setPreviewEmail(e)}
                  className="btn btn-secondary btn-sm"
                >
                  <Eye size={13} />
                  <span>Read Message</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Reader Modal */}
      {previewEmail && (
        <div className="modal-overlay" onClick={() => setPreviewEmail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E3E7E1', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '4px' }}>
                  {previewEmail.emailType}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#29332B' }}>
                  {previewEmail.subject}
                </h3>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#69746B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                border: '1px solid #E3E7E1',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#FAF8F1',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setPreviewEmail(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

