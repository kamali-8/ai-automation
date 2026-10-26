import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET() {
  const domains = await prisma.domain.findMany({
    include: {
      syllabi: true,
      _count: {
        select: {
          taskTemplates: true,
          internships: true,
          learningMaterials: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      id,
      name,
      slug,
      description,
      totalDurationWeeks,
      defaultTaskDurationDays,
      passingScore,
      maxRevisionAttempts,
      passingRequiredForNext,
      allowedSubmissionFormats,
    } = body;

    let domain;

    if (id) {
      // Update existing domain configuration
      domain = await prisma.domain.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(description !== undefined && { description }),
          ...(totalDurationWeeks && { totalDurationWeeks: Number(totalDurationWeeks) }),
          ...(defaultTaskDurationDays && { defaultTaskDurationDays: Number(defaultTaskDurationDays) }),
          ...(passingScore && { passingScore: Number(passingScore) }),
          ...(maxRevisionAttempts !== undefined && { maxRevisionAttempts: Number(maxRevisionAttempts) }),
          ...(typeof passingRequiredForNext === 'boolean' && { passingRequiredForNext }),
          ...(allowedSubmissionFormats && { allowedSubmissionFormats }),
        },
      });
    } else {
      // Create new domain
      if (!name || !slug) {
        return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
      }

      domain = await prisma.domain.create({
        data: {
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          description: description || null,
          totalDurationWeeks: Number(totalDurationWeeks) || 4,
          defaultTaskDurationDays: Number(defaultTaskDurationDays) || 3,
          passingScore: Number(passingScore) || 70,
          maxRevisionAttempts: Number(maxRevisionAttempts) ?? 2,
          passingRequiredForNext: passingRequiredForNext ?? true,
          allowedSubmissionFormats: allowedSubmissionFormats || 'text,zip,pdf,py,js,ts,ipynb,docx',
        },
      });
    }

    await logActivity({
      actorId: session.id,
      actorRole: 'ADMIN',
      action: id ? 'UPDATE_DOMAIN_CONFIG' : 'CREATE_DOMAIN',
      entityType: 'Domain',
      entityId: domain.id,
      details: body,
    });

    return NextResponse.json({ success: true, domain });
  } catch (error: unknown) {
    console.error('Domain config error:', error);
    return NextResponse.json(
      { error: `Domain update failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

