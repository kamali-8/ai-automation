import prisma from './db';

export type SimulatedEmailType =
  | 'ACCOUNT_WELCOME'
  | 'TASK_ASSIGNED'
  | 'SUBMISSION_CONFIRMED'
  | 'REVIEW_FEEDBACK'
  | 'NEXT_TASK'
  | 'DEADLINE_REMINDER'
  | 'TASK_OVERDUE'
  | 'INTERNSHIP_COMPLETED';

export interface SendEmailParams {
  recipientEmail: string;
  recipientName: string;
  emailType: SimulatedEmailType;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  relatedTaskId?: string | null;
  relatedInternshipId?: string | null;
  eventKey?: string; // Idempotency key to prevent duplicates
}

/**
 * Creates a simulated email in the EmailOutbox.
 * Prevents duplicate emails for the same eventKey.
 */
export async function sendSimulatedEmail(params: SendEmailParams) {
  const {
    recipientEmail,
    recipientName,
    emailType,
    subject,
    bodyText,
    bodyHtml,
    relatedTaskId,
    relatedInternshipId,
    eventKey,
  } = params;

  // Check if email for this event was already created
  if (eventKey) {
    const existing = await prisma.emailOutbox.findUnique({
      where: { eventKey },
    });
    if (existing) {
      return { record: existing, duplicate: true };
    }
  }

  // Format HTML with clear simulation banner
  const simulatedBanner = `
    <div style="background-color: #FAF8F1; border: 2px dashed #B8D8B0; padding: 12px; margin-bottom: 20px; border-radius: 8px; font-family: sans-serif; text-align: center;">
      <strong style="color: #29332B; font-size: 13px;">[ SIMULATED DEMO EMAIL — NOT ACTUALLY SENT VIA SMTP ]</strong>
      <p style="margin: 4px 0 0; font-size: 11px; color: #69746B;">This message is captured locally in the application Email Outbox for demonstration.</p>
    </div>
  `;

  const finalHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #29332B; background: #ffffff; padding: 24px; border: 1px solid #E3E7E1; border-radius: 12px;">
      ${simulatedBanner}
      <h2 style="color: #29332B; margin-top: 0; font-size: 20px; border-bottom: 1px solid #E3E7E1; padding-bottom: 12px;">${escapeHtml(subject)}</h2>
      <div style="font-size: 14px; line-height: 1.6; color: #29332B;">
        ${bodyHtml || `<p>${escapeHtml(bodyText).replace(/\n/g, '<br/>')}</p>`}
      </div>
      <hr style="border: none; border-top: 1px solid #E3E7E1; margin: 24px 0 16px;" />
      <p style="font-size: 11px; color: #69746B; margin: 0;">
        Intern Management Automation System • Demo Notification • Recipient: ${escapeHtml(recipientName)} (${escapeHtml(recipientEmail)})
      </p>
    </div>
  `;

  const record = await prisma.emailOutbox.create({
    data: {
      recipientEmail,
      recipientName,
      subject,
      bodyText,
      bodyHtml: finalHtml,
      emailType,
      relatedTaskId: relatedTaskId || null,
      relatedInternshipId: relatedInternshipId || null,
      eventKey: eventKey || null,
      simulatedStatus: 'SIMULATED_DELIVERED',
      sentAt: new Date(),
    },
  });

  return { record, duplicate: false };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

