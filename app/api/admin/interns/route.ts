import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { RosterRowSchema } from '@/lib/validation';
import { assignInitialTask, calculateDueDate } from '@/lib/scheduler';
import { sendSimulatedEmail } from '@/lib/outbox';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const interns = await prisma.user.findMany({
    where: { role: 'INTERN' },
    include: {
      domain: true,
      internships: {
        include: {
          assignments: {
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ interns });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let rows: Array<{
      name?: unknown;
      email?: unknown;
      domain?: unknown;
      startDate?: unknown;
      durationWeeks?: unknown;
    }> = [];
    let action = 'import'; // 'preview' | 'import'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      action = (formData.get('action') as string) || 'import';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        return NextResponse.json({ error: 'Excel file contains no sheets' }, { status: 400 });
      }

      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      const body = await req.json();
      rows = body.rows || [];
      action = body.action || 'import';
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No rows found in uploaded roster' }, { status: 400 });
    }

    // Load existing domains from DB
    const allDomains = await prisma.domain.findMany();
    const domainMap = new Map<string, typeof allDomains[0]>();
    for (const d of allDomains) {
      domainMap.set(d.name.toLowerCase().trim(), d);
      domainMap.set(d.slug.toLowerCase().trim(), d);
    }

    // Load existing intern emails from DB
    const existingUsers = await prisma.user.findMany({
      where: { role: 'INTERN' },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const seenEmailsInFile = new Set<string>();
    const validatedRows: Array<{
      raw: Record<string, unknown>;
      normalized: {
        name: string;
        email: string;
        domain: string;
        domainId: string;
        startDate: Date;
        durationWeeks: number;
      };
      isValid: boolean;
      errors: string[];
    }> = [];

    // Row-by-row validation
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      const errors: string[] = [];

      // Flexible column keys
      const name = String(row.name || row.Name || row['Full Name'] || '').trim();
      const email = String(row.email || row.Email || row['Email Address'] || '')
        .trim()
        .toLowerCase();
      const domainName = String(row.domain || row.Domain || row['Internship Domain'] || '').trim();
      const startDateStr = String(row.startDate || row['Start Date'] || '').trim();
      const durationVal = row.durationWeeks || row['Duration (Weeks)'] || 4;

      // Zod validation check
      const parsed = RosterRowSchema.safeParse({
        name,
        email,
        domain: domainName,
        durationWeeks: Number(durationVal) || 4,
      });

      if (!parsed.success) {
        errors.push(...parsed.error.issues.map((e) => e.message));
      }

      // Check duplicate within the uploaded file
      if (email && seenEmailsInFile.has(email)) {
        errors.push(`Duplicate email found in file: ${email}`);
      } else if (email) {
        seenEmailsInFile.add(email);
      }

      // Check duplicate already existing in database
      if (email && existingEmailSet.has(email)) {
        errors.push(`Intern with email ${email} is already registered in the system.`);
      }

      // Match domain
      const matchedDomain = domainMap.get(domainName.toLowerCase());
      let domainId = '';
      if (!matchedDomain) {
        // Auto-create or flag
        const availableDomainsList = allDomains.map((d) => d.name).join(', ');
        errors.push(
          `Domain "${domainName}" is not recognized. Available domains: ${availableDomainsList}`
        );
      } else {
        domainId = matchedDomain.id;
      }

      // Parse start date
      let startDate = new Date();
      if (startDateStr) {
        const parsedDate = new Date(startDateStr);
        if (!isNaN(parsedDate.getTime())) {
          startDate = parsedDate;
        }
      }

      const durationWeeks = Number(durationVal) || (matchedDomain?.totalDurationWeeks ?? 4);

      validatedRows.push({
        raw: row,
        normalized: {
          name,
          email,
          domain: matchedDomain?.name || domainName,
          domainId,
          startDate,
          durationWeeks,
        },
        isValid: errors.length === 0,
        errors,
      });
    }

    // If preview mode, return validation preview
    if (action === 'preview') {
      const validCount = validatedRows.filter((r) => r.isValid).length;
      const invalidCount = validatedRows.length - validCount;
      return NextResponse.json({
        action: 'preview',
        totalRows: validatedRows.length,
        validCount,
        invalidCount,
        rows: validatedRows,
      });
    }

    // In import mode, process valid records
    const importedInterns = [];
    const skippedRows = [];

    for (const item of validatedRows) {
      if (!item.isValid) {
        skippedRows.push(item);
        continue;
      }

      const { name, email, domainId, startDate, durationWeeks } = item.normalized;

      // Compute end date
      const endDate = new Date(startDate.getTime());
      endDate.setDate(endDate.getDate() + durationWeeks * 7);

      // Create User
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: 'INTERN',
          domainId,
        },
      });

      // Create Internship
      const internship = await prisma.internship.create({
        data: {
          internId: user.id,
          domainId,
          startDate,
          endDate,
          durationWeeks,
          status: 'ACTIVE',
          progressPercent: 0,
        },
      });

      // Send simulated welcome email
      await sendSimulatedEmail({
        recipientEmail: email,
        recipientName: name,
        emailType: 'ACCOUNT_WELCOME',
        subject: `Welcome to the Internship Program: ${item.normalized.domain}`,
        bodyText: `Dear ${name},\n\nWelcome to your ${item.normalized.domain} internship! Your account has been registered.\n\nStart Date: ${startDate.toLocaleDateString()}\nEnd Date: ${endDate.toLocaleDateString()} (${durationWeeks} weeks)\n\nYou can log in using your registered Name ("${name}") and Email ("${email}").`,
        relatedInternshipId: internship.id,
        eventKey: `WELCOME-${user.id}`,
      });

      // Attempt to assign initial task (Task 1) if available for this domain
      const initialAssignment = await assignInitialTask(internship.id);

      importedInterns.push({
        id: user.id,
        name: user.name,
        email: user.email,
        domain: item.normalized.domain,
        internshipId: internship.id,
        assignedTask: initialAssignment ? initialAssignment.title : 'Pending Task Plan',
      });
    }

    await logActivity({
      actorId: session.id,
      actorRole: 'ADMIN',
      action: 'ROSTER_IMPORTED',
      entityType: 'User',
      details: {
        totalRows: validatedRows.length,
        importedCount: importedInterns.length,
        skippedCount: skippedRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: importedInterns.length,
      skippedCount: skippedRows.length,
      imported: importedInterns,
      skipped: skippedRows,
    });
  } catch (error: unknown) {
    console.error('Roster import error:', error);
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

