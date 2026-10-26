import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { AdminLoginSchema, InternLoginSchema } from '@/lib/validation';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role || 'INTERN';

    if (role === 'ADMIN') {
      const parsed = AdminLoginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid admin credentials', details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
        return NextResponse.json(
          { error: 'Invalid admin email or password' },
          { status: 401 }
        );
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid admin email or password' },
          { status: 401 }
        );
      }

      const token = await createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN',
      });

      const res = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'ADMIN',
        },
      });

      setSessionCookie(res, token);
      await logActivity({
        actorId: user.id,
        actorRole: 'ADMIN',
        action: 'ADMIN_LOGIN',
        entityType: 'User',
        entityId: user.id,
      });

      return res;
    } else {
      // Intern Login (Demo Name + Email validation against roster)
      const parsed = InternLoginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid intern login details', details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { name, email } = parsed.data;
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          role: 'INTERN',
        },
        include: {
          domain: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          {
            error:
              'Intern account not found. Please ensure you have been imported into the roster by the administrator.',
          },
          { status: 404 }
        );
      }

      // Validate name match (case-insensitive substring or match)
      if (user.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
        return NextResponse.json(
          {
            error: `Name does not match our records for ${email}. Expected: ${user.name}`,
          },
          { status: 401 }
        );
      }

      const token = await createSessionToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'INTERN',
        domainId: user.domainId,
      });

      const res = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'INTERN',
          domainId: user.domainId,
          domainName: user.domain?.name,
        },
      });

      setSessionCookie(res, token);
      await logActivity({
        actorId: user.id,
        actorRole: 'INTERN',
        action: 'INTERN_LOGIN',
        entityType: 'User',
        entityId: user.id,
      });

      return res;
    }
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}

