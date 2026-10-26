# Intern Management Automation

**Intern Management Automation** is a full-stack local demo application built to automate cross-domain internship workflows, individual schedule management, syllabus document text extraction, AI task generation, interactive AI mentoring, automated rubric submission evaluations, and simulated email workflows.

---

## Technology Stack

- **Framework**: Next.js 14 with App Router & React 18
- **Language**: TypeScript
- **Database**: SQLite (via Prisma ORM, file: `./dev.db`)
- **Validation**: Zod (strict schema validation for AI task plans, reviews, roster imports, and auth)
- **Document Extractors**:
  - `xlsx` for Excel spreadsheets (.xlsx, .xls, .csv)
  - `mammoth` for Word documents (.docx)
  - `pdfjs-dist` for PDF text extraction (.pdf)
  - UTF-8 decoders for Markdown (.md) and Text (.txt)
- **Local AI Engine**: Ollama with configurable Qwen model (`qwen2.5:latest`)
- **Automated Tests**: Vitest
- **Design System**: Modern pastel palette (`#B8D8B0`, `#DCEBD7`, `#FAF8F1`, `#E9E2F5`, `#E2ECF8`, `#29332B`, `#69746B`, `#E3E7E1`)

---

## Demo Credentials

### 1. Administrator Account
- **Email**: `admin@gmail.com`
- **Password**: `admin123`
- *Stored securely as a salted bcrypt hash in SQLite; server-protected routes; no public admin registration.*

### 2. Demo Intern Accounts
- **Name**: `Alice Johnson` | **Email**: `alice@example.com` (Python Development domain)
- **Name**: `Bob Smith` | **Email**: `bob@example.com` (Data Science domain)
- **Name**: `Carol Danvers` | **Email**: `carol@example.com` (Web Development domain)
- *Demo simplification: Interns log in with their imported Name and Email matching the Excel roster.*

---

## PowerShell Setup & Execution Commands

Run these commands in PowerShell in the project directory:

### 1. Installation
```powershell
npm install
```

### 2. Database Setup & Migrations
```powershell
# Sync SQLite database schema
npx prisma db push
```

### 3. Seed Database
```powershell
# Seeds admin account, domains, syllabi, task templates, demo interns, and initial assignment
npm run seed
```

### 4. Run Automated Vitest Tests
```powershell
npm test
```
*Runs all 24 automated unit and integration tests covering authentication, roster validation, document parsers, AI Zod schemas, individual deadline scheduling, revision limits, and outbox idempotency.*

### 5. Production Build
```powershell
npm run build
```

### 6. Start Application
```powershell
# Development mode
npm run dev

# Or Production server
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Sample Test Files Included in Repository

- `sample_interns_valid.xlsx`: 4 valid interns ready for instant import testing.
- `sample_interns_invalid.xlsx`: Mixed spreadsheet with duplicates, invalid email formats, and unrecognized domains for testing validation.

---

## Complete Workflow Verification Guide

1. **Admin Sign In**:
   - Go to `/login?role=admin` and sign in with `admin@gmail.com` / `admin123`.
2. **Syllabus & Documents (`/admin/syllabus`)**:
   - Upload PDF, DOCX, TXT, or XLSX learning materials.
   - Inspect extracted plain text.
   - Configure domain duration, passing scores, and revision limits.
3. **Intern Roster Import (`/admin/interns`)**:
   - Upload `sample_interns_valid.xlsx` or `sample_interns_invalid.xlsx`.
   - Click **Preview Roster** to view row-by-row validation.
   - Click **Import Valid Records** to enroll interns, create schedules, and assign Task 1.
4. **AI Task Planning (`/admin/tasks`)**:
   - Click **AI Task Planner** to generate structured tasks from syllabus text using Ollama.
   - Tasks are saved as **DRAFTS** and require admin approval before activation.
   - Click **Manual Task Creator** as fallback.
5. **Simulated Email Outbox (`/admin/outbox`)**:
   - View all simulated messages with the banner `[ SIMULATED DEMO EMAIL — NOT ACTUALLY SENT ]`.
   - Filter by category: `ACCOUNT_WELCOME`, `TASK_ASSIGNED`, `SUBMISSION_CONFIRMED`, `REVIEW_FEEDBACK`, `NEXT_TASK`, `DEADLINE_REMINDER`, `TASK_OVERDUE`, `INTERNSHIP_COMPLETED`.
6. **Intern Portal (`/intern`)**:
   - Log in as `Alice Johnson` (`alice@example.com`).
   - View current milestone, deadline, and rubric.
   - Ask questions to the **AI Task Mentor (`/intern/chat`)**.
   - Submit text, project links, or upload files.
   - Receive instant AI rubric evaluation and score.
   - When passing threshold is met, the next milestone is automatically assigned!
7. **Admin Progress & Review Override (`/admin/progress`)**:
   - Inspect any intern submission.
   - Override score, status (`PASSED`, `REVISION_REQUESTED`, `FAILED`), and provide admin notes.
   - Trigger the scheduler with **"Run Scheduler Now"** on the top bar.

---

## Ollama Local AI Configuration

The application connects to Ollama running locally:
- `OLLAMA_BASE_URL="http://127.0.0.1:11434"`
- `OLLAMA_MODEL="qwen2.5:latest"`

If Ollama is not running:
- The UI displays an "Offline / Standby" status indicator.
- The AI Task Planner allows retry or manual task creation fallback.
- The AI Task Tutor displays original task instructions without fabricating responses.
- Submissions are safely saved and flagged with `humanReviewRequired: true` for admin inspection.

---

## Security & Architecture Notes

- Passwords are encrypted with `bcryptjs`.
- Session tokens are signed using `jose` with `HS256` and stored in `httpOnly` cookies.
- Intern data isolation ensures interns can only access their own profile, submissions, and reviews.
- Uploaded files are stored in `uploads/` safely outside webroot.
- No code uploaded by interns is executed at runtime.

