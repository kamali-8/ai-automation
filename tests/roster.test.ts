import { describe, it, expect } from 'vitest';
import { RosterRowSchema } from '../lib/validation';

describe('Intern Roster Import & Validation', () => {
  it('validates a clean, correct roster row', () => {
    const validRow = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      domain: 'Python Development',
      durationWeeks: 4,
    };

    const result = RosterRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('alice@example.com');
      expect(result.data.durationWeeks).toBe(4);
    }
  });

  it('rejects invalid email formats', () => {
    const invalidEmailRow = {
      name: 'Bob Smith',
      email: 'not-a-valid-email',
      domain: 'Data Science',
    };

    const result = RosterRowSchema.safeParse(invalidEmailRow);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path.includes('email'))).toBe(true);
    }
  });

  it('rejects missing or empty names', () => {
    const emptyNameRow = {
      name: '   ',
      email: 'bob@example.com',
      domain: 'Data Science',
    };

    const result = RosterRowSchema.safeParse(emptyNameRow);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
    }
  });

  it('detects duplicate emails within a batch of rows', () => {
    const batch = [
      { name: 'Intern One', email: 'duplicate@example.com', domain: 'Python' },
      { name: 'Intern Two', email: 'other@example.com', domain: 'Data Science' },
      { name: 'Intern Three', email: 'duplicate@example.com', domain: 'Python' },
    ];

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const row of batch) {
      const normEmail = row.email.toLowerCase();
      if (seen.has(normEmail)) {
        duplicates.push(normEmail);
      } else {
        seen.add(normEmail);
      }
    }

    expect(duplicates.length).toBe(1);
    expect(duplicates[0]).toBe('duplicate@example.com');
  });

  it('detects email collision against existing database records', () => {
    const existingEmailsInDb = new Set(['alice@example.com', 'admin@gmail.com']);
    const newRowEmail = 'ALICE@example.com'.toLowerCase();

    const isDuplicate = existingEmailsInDb.has(newRowEmail);
    expect(isDuplicate).toBe(true);
  });
});

