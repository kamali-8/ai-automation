import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import { extractTextFromFile } from '@/lib/documents/extractor';
import { logActivity } from '@/lib/activity';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const materials = await prisma.learningMaterial.findMany({
    include: { domain: true, syllabus: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ materials });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await req.formData();
    const domainId = formData.get('domainId') as string;
    const title = (formData.get('title') as string) || '';
    const file = formData.get('file') as File | null;
    const rawText = formData.get('rawText') as string | null;

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Ensure syllabus exists for this domain
    let syllabus = await prisma.syllabus.findFirst({
      where: { domainId, isActive: true },
    });

    if (!syllabus) {
      syllabus = await prisma.syllabus.create({
        data: {
          domainId,
          title: `${domain.name} Syllabus`,
          description: `Core syllabus for ${domain.name}`,
          isActive: true,
        },
      });
    }

    // Case 1: Direct text input (e.g. pasted markdown or syllabus text)
    if (rawText && (!file || file.size === 0)) {
      const material = await prisma.learningMaterial.create({
        data: {
          domainId,
          syllabusId: syllabus.id,
          title: title || 'Manual Syllabus Notes',
          originalFilename: 'manual_entry.txt',
          fileType: 'txt',
          fileSize: Buffer.byteLength(rawText, 'utf-8'),
          extractedText: rawText.trim(),
          extractionStatus: rawText.trim() ? 'SUCCESS' : 'FAILED',
          errorMessage: rawText.trim() ? null : 'Empty text entered.',
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, material });
    }

    // Case 2: File upload
    if (!file) {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    const originalFilename = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(originalFilename).toLowerCase().replace('.', '');

    // Extract text using our multi-format extractor
    const extraction = await extractTextFromFile(fileBuffer, originalFilename);

    // Save file safely in private uploads folder
    const safeFilename = `${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    await fs.writeFile(filePath, fileBuffer);

    const material = await prisma.learningMaterial.create({
      data: {
        domainId,
        syllabusId: syllabus.id,
        title: title || originalFilename,
        originalFilename,
        fileType: ext || 'unknown',
        filePath: safeFilename,
        fileSize: fileBuffer.length,
        extractedText: extraction.text || null,
        extractionStatus: extraction.status,
        errorMessage: extraction.error || null,
        isActive: true,
      },
    });

    await logActivity({
      actorId: session.id,
      actorRole: 'ADMIN',
      action: 'UPLOAD_MATERIAL',
      entityType: 'LearningMaterial',
      entityId: material.id,
      details: {
        domainId,
        filename: originalFilename,
        status: extraction.status,
        words: extraction.wordCount,
      },
    });

    return NextResponse.json({
      success: true,
      material,
      extraction,
    });
  } catch (error: unknown) {
    console.error('Material upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { id, isActive, title } = body;

  const updated = await prisma.learningMaterial.update({
    where: { id },
    data: {
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(title && { title }),
    },
  });

  return NextResponse.json({ success: true, material: updated });
}

