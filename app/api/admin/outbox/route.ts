import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const recipient = searchParams.get('recipient');

  const emails = await prisma.emailOutbox.findMany({
    where: {
      ...(type && { emailType: type }),
      ...(recipient && {
        recipientEmail: { contains: recipient.toLowerCase() },
      }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ emails });
}

