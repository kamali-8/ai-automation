import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, createSessionToken, verifyToken } from '../lib/auth';

describe('Admin & Intern Authentication', () => {
  it('correctly hashes and verifies passwords with bcryptjs', async () => {
    const raw = 'admin123';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true);

    const match = await comparePassword(raw, hash);
    expect(match).toBe(true);

    const wrongMatch = await comparePassword('wrongpassword', hash);
    expect(wrongMatch).toBe(false);
  });

  it('creates and verifies signed JWT session tokens for admin', async () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@gmail.com',
      name: 'System Administrator',
      role: 'ADMIN' as const,
    };

    const token = await createSessionToken(adminUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe('admin-1');
    expect(verified?.role).toBe('ADMIN');
    expect(verified?.email).toBe('admin@gmail.com');
  });

  it('enforces intern access isolation in session payloads', async () => {
    const internUser = {
      id: 'intern-alice',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: 'INTERN' as const,
      domainId: 'domain-python',
    };

    const token = await createSessionToken(internUser);
    const verified = await verifyToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.role).toBe('INTERN');
    expect(verified?.role).not.toBe('ADMIN');
    expect(verified?.id).toBe('intern-alice');
    expect(verified?.domainId).toBe('domain-python');
  });

  it('returns null for tampered or invalid tokens', async () => {
    const tampered = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    const verified = await verifyToken(tampered);
    expect(verified).toBeNull();
  });
});

