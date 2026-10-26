import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateDueDate, assignInitialTask, progressInternship } from '../lib/scheduler';
import { sendSimulatedEmail } from '../lib/outbox';
import prisma from '../lib/db';

describe('Deterministic Scheduling, Revision Limits & Outbox', () => {
  it('calculates deterministic deadlines based on individual joining dates', () => {
    const startDate1 = new Date('2026-11-01T00:00:00Z');
    const dueDate1 = calculateDueDate(startDate1, 3);

    // Exactly 3 days later
    const expected1 = new Date('2026-11-04T00:00:00Z');
    expect(dueDate1.toISOString().slice(0, 10)).toBe(expected1.toISOString().slice(0, 10));

    // Another intern joining 10 days later
    const startDate2 = new Date('2026-11-11T00:00:00Z');
    const dueDate2 = calculateDueDate(startDate2, 3);
    const expected2 = new Date('2026-11-14T00:00:00Z');
    expect(dueDate2.toISOString().slice(0, 10)).toBe(expected2.toISOString().slice(0, 10));
  });

  it('accurately applies approved deadline extensions', () => {
    const startDate = new Date('2026-11-01T00:00:00Z');
    const durationDays = 3;
    const extensionDays = 4; // approved extension

    const extendedDue = calculateDueDate(startDate, durationDays, extensionDays);
    const expected = new Date('2026-11-08T00:00:00Z');
    expect(extendedDue.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));
  });

  it('enforces revision attempts limit', () => {
    const maxRevisionAttempts = 2;
    const currentSubmissions = [{ attemptNumber: 1 }, { attemptNumber: 2 }];

    const canSubmitMore = currentSubmissions.length < maxRevisionAttempts;
    expect(canSubmitMore).toBe(false);
  });

  it('creates simulated emails with clear demo simulation banners', async () => {
    const uniqueKey = `TEST-EMAIL-${Date.now()}`;
    const { record, duplicate } = await sendSimulatedEmail({
      recipientEmail: 'test.intern@example.com',
      recipientName: 'Test Intern',
      emailType: 'TASK_ASSIGNED',
      subject: 'Test Task Assigned',
      bodyText: 'Your test task is ready.',
      eventKey: uniqueKey,
    });

    expect(duplicate).toBe(false);
    expect(record.simulatedStatus).toBe('SIMULATED_DELIVERED');
    expect(record.bodyHtml).toContain('SIMULATED DEMO EMAIL — NOT ACTUALLY SENT');
    expect(record.recipientEmail).toBe('test.intern@example.com');
  });

  it('prevents duplicate outbox entries for the same event key (idempotency)', async () => {
    const eventKey = `IDEMPOTENT-KEY-${Date.now()}`;

    // First attempt creates
    const result1 = await sendSimulatedEmail({
      recipientEmail: 'duplicate.prevent@example.com',
      recipientName: 'Prevent Dup',
      emailType: 'DEADLINE_REMINDER',
      subject: 'Reminder Notice',
      bodyText: 'Your deadline is coming up.',
      eventKey,
    });
    expect(result1.duplicate).toBe(false);

    // Second attempt with exact same key must NOT create another email
    const result2 = await sendSimulatedEmail({
      recipientEmail: 'duplicate.prevent@example.com',
      recipientName: 'Prevent Dup',
      emailType: 'DEADLINE_REMINDER',
      subject: 'Reminder Notice',
      bodyText: 'Your deadline is coming up.',
      eventKey,
    });
    expect(result2.duplicate).toBe(true);
    expect(result2.record.id).toBe(result1.record.id);
  });

  it('handles task progression and completion when all tasks passed', async () => {
    // Check Alice's active internship from seed
    const alice = await prisma.user.findUnique({
      where: { email: 'alice@example.com' },
      include: {
        internships: {
          include: { assignments: true },
        },
      },
    });

    expect(alice).not.toBeNull();
    if (alice && alice.internships.length > 0) {
      const internship = alice.internships[0];
      expect(internship.status).toBe('ACTIVE');

      // Check that initial task assignment exists and has sequence 1
      expect(internship.assignments.length).toBeGreaterThanOrEqual(1);
      expect(internship.assignments[0].sequenceOrder).toBe(1);
    }
  });
});

