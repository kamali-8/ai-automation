import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'INTERN') {
    return NextResponse.json({ error: 'Intern access required' }, { status: 403 });
  }

  const emails = await prisma.emailOutbox.findMany({
    where: {
      recipientEmail: session.email.toLowerCase(),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ emails });
}

