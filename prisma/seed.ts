import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Intern Management Automation database...');

  // 1. Seed Admin Account
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      name: 'System Administrator',
    },
    create: {
      email: 'admin@gmail.com',
      name: 'System Administrator',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
  });
  console.log(`Admin account seeded: ${admin.email}`);

  // 2. Seed Domains
  const pythonDomain = await prisma.domain.upsert({
    where: { slug: 'python' },
    update: {},
    create: {
      name: 'Python Development',
      slug: 'python',
      description: 'Hands-on Python engineering: modular architecture, data structures, and CLI tools.',
      totalDurationWeeks: 4,
      defaultTaskDurationDays: 3,
      passingScore: 70,
      maxRevisionAttempts: 2,
      passingRequiredForNext: true,
      allowedSubmissionFormats: 'text,zip,pdf,py,ipynb',
    },
  });

  const dsDomain = await prisma.domain.upsert({
    where: { slug: 'data-science' },
    update: {},
    create: {
      name: 'Data Science',
      slug: 'data-science',
      description: 'Data analysis, statistics, pandas, data cleaning, and actionable insights.',
      totalDurationWeeks: 4,
      defaultTaskDurationDays: 4,
      passingScore: 70,
      maxRevisionAttempts: 2,
      passingRequiredForNext: true,
      allowedSubmissionFormats: 'text,zip,pdf,py,ipynb,csv',
    },
  });

  const webDomain = await prisma.domain.upsert({
    where: { slug: 'web-dev' },
    update: {},
    create: {
      name: 'Web Development',
      slug: 'web-dev',
      description: 'Modern full-stack web development with React, TypeScript, and REST APIs.',
      totalDurationWeeks: 4,
      defaultTaskDurationDays: 3,
      passingScore: 70,
      maxRevisionAttempts: 2,
      passingRequiredForNext: true,
      allowedSubmissionFormats: 'text,zip,pdf,js,ts,html,css',
    },
  });

  // 3. Seed Syllabi & Learning Materials
  const pythonSyllabus = await prisma.syllabus.upsert({
    where: { id: 'syl-python-v1' },
    update: {},
    create: {
      id: 'syl-python-v1',
      domainId: pythonDomain.id,
      title: 'Python Core & Applied Engineering Syllabus',
      description: 'Comprehensive 4-week Python internship syllabus covering syntax, algorithms, tests, and CLI apps.',
      version: '1.0',
      isActive: true,
    },
  });

  await prisma.learningMaterial.upsert({
    where: { id: 'mat-py-1' },
    update: {},
    create: {
      id: 'mat-py-1',
      domainId: pythonDomain.id,
      syllabusId: pythonSyllabus.id,
      title: 'Python Fundamentals & Clean Code Guidelines',
      originalFilename: 'python_fundamentals.md',
      fileType: 'md',
      extractionStatus: 'SUCCESS',
      fileSize: 4200,
      extractedText: `# Python Fundamentals & Clean Code

## Module 1: Python Idioms and Syntax
- Variables, data types, type hints (PEP 484)
- Functions, arguments, keyword arguments, and docstrings
- Control flow, list comprehensions, and generator expressions
- Exception handling with try/except/finally blocks

## Module 2: Modular Programming & File I/O
- Structuring Python packages with __init__.py
- Reading and writing CSV and JSON files safely using context managers (with open)
- Logging vs printing: best practices for command-line applications

## Module 3: Testing & Validation
- Writing unit tests using pytest or unittest
- Validating inputs and handling boundary conditions gracefully
- Writing clear documentation and README files`,
    },
  });

  // 4. Seed Task Templates for Python
  const pyRubric1 = JSON.stringify([
    { criterion: 'Functional correctness of CLI argument parsing', points: 35, description: 'Correctly parses flags, options, and file paths.' },
    { criterion: 'Clean code, type hints, docstrings', points: 30, description: 'Follows PEP 8 guidelines and includes docstrings.' },
    { criterion: 'Error handling & input validation', points: 20, description: 'Handles missing files or invalid inputs gracefully.' },
    { criterion: 'Deliverables & Documentation', points: 15, description: 'Includes working code and README with run instructions.' },
  ]);

  const pyTask1 = await prisma.taskTemplate.upsert({
    where: { id: 'task-py-1' },
    update: {},
    create: {
      id: 'task-py-1',
      domainId: pythonDomain.id,
      syllabusId: pythonSyllabus.id,
      sequenceOrder: 1,
      title: 'Task 1: Build a Structured File Analyzer CLI',
      topic: 'Modular Python, File I/O & Argument Parsing',
      learningObjective: 'Master standard library argparse/sys, file reading context managers, and exception handling.',
      instructions: 'Create a Python script or package that accepts a directory or file path and outputs statistics: line count, word count, character count, and top 5 frequent words. Handle file-not-found and permission errors gracefully.',
      expectedDeliverables: 'analyzer.py source code or zip archive, with a short README explaining usage and test results.',
      difficulty: 'BEGINNER',
      suggestedDurationDays: 3,
      deadlineRules: 'Due within 3 calendar days of task assignment.',
      evaluationRubric: pyRubric1,
      passingCriteria: 'Score >= 70% with functional CLI parsing and error handling.',
      allowedSubmissionFormats: 'text,zip,py,pdf',
      status: 'APPROVED',
    },
  });

  const pyRubric2 = JSON.stringify([
    { criterion: 'Object-Oriented Design & Data Modeling', points: 40, description: 'Appropriate classes, inheritance or composition.' },
    { criterion: 'Unit Test Coverage', points: 35, description: 'Meaningful unit tests covering core operations and edge cases.' },
    { criterion: 'Documentation and Code Quality', points: 25, description: 'Clean methods, clear comments, and execution instructions.' },
  ]);

  const pyTask2 = await prisma.taskTemplate.upsert({
    where: { id: 'task-py-2' },
    update: {},
    create: {
      id: 'task-py-2',
      domainId: pythonDomain.id,
      syllabusId: pythonSyllabus.id,
      sequenceOrder: 2,
      title: 'Task 2: In-Memory Task Manager with Unit Tests',
      topic: 'Object-Oriented Programming & Pytest',
      learningObjective: 'Implement modular classes, state persistence via JSON, and thorough unit tests.',
      instructions: 'Build a TaskManager class that supports creating, updating, completing, and filtering tasks by status and priority. Write at least 4 unit tests covering additions, invalid transitions, and persistence.',
      expectedDeliverables: 'Source code (task_manager.py, test_task_manager.py) and test execution output.',
      difficulty: 'INTERMEDIATE',
      suggestedDurationDays: 3,
      deadlineRules: 'Due within 3 calendar days of previous task completion.',
      evaluationRubric: pyRubric2,
      passingCriteria: 'Score >= 70% with passing unit tests.',
      allowedSubmissionFormats: 'text,zip,py',
      status: 'APPROVED',
    },
  });

  const pyRubric3 = JSON.stringify([
    { criterion: 'REST API integration and request handling', points: 40, description: 'Correct HTTP calls, query params, and status checks.' },
    { criterion: 'Data parsing and formatted output', points: 35, description: 'Cleanly formats JSON responses into tables or summaries.' },
    { criterion: 'Rate limiting and network resilience', points: 25, description: 'Handles timeouts and network errors gracefully.' },
  ]);

  await prisma.taskTemplate.upsert({
    where: { id: 'task-py-3' },
    update: {},
    create: {
      id: 'task-py-3',
      domainId: pythonDomain.id,
      syllabusId: pythonSyllabus.id,
      sequenceOrder: 3,
      title: 'Task 3: Weather & Currency Data Aggregator',
      topic: 'HTTP Clients, JSON Parsing & API Integration',
      learningObjective: 'Interact with external public APIs using requests or urllib, parse JSON responses, and handle API errors.',
      instructions: 'Build a command-line utility that fetches current currency exchange rates or weather data from a public API, parses the response, and formats a clean ASCII table summary.',
      expectedDeliverables: 'Python script, requirements.txt, and sample terminal output.',
      difficulty: 'ADVANCED',
      suggestedDurationDays: 4,
      deadlineRules: 'Due within 4 calendar days of task assignment.',
      evaluationRubric: pyRubric3,
      passingCriteria: 'Score >= 70% with successful API data extraction.',
      allowedSubmissionFormats: 'text,zip,py',
      status: 'APPROVED',
    },
  });

  // 5. Seed Task Templates for Data Science
  const dsRubric1 = JSON.stringify([
    { criterion: 'Data Loading & Quality Inspection', points: 35, description: 'Identifies missing values, duplicates, and data types.' },
    { criterion: 'Data Cleaning & Transformation', points: 40, description: 'Imputes or cleans missing data and transforms columns.' },
    { criterion: 'Exploratory Summary & Insights', points: 25, description: 'Provides clear written insights and statistical summaries.' },
  ]);

  await prisma.taskTemplate.upsert({
    where: { id: 'task-ds-1' },
    update: {},
    create: {
      id: 'task-ds-1',
      domainId: dsDomain.id,
      sequenceOrder: 1,
      title: 'Task 1: Exploratory Data Analysis & Cleaning',
      topic: 'Pandas, NumPy, and Data Quality Assessment',
      learningObjective: 'Perform exploratory analysis, detect anomalies, handle missing values, and summarize distributions.',
      instructions: 'Load a dataset (provided or standard sample like Iris/Titanic), calculate descriptive statistics, identify missing data and outliers, and write a concise data cleaning pipeline.',
      expectedDeliverables: 'Jupyter notebook (.ipynb) or Python script (.py) with markdown explanations and summary statistics.',
      difficulty: 'BEGINNER',
      suggestedDurationDays: 4,
      deadlineRules: 'Due within 4 calendar days.',
      evaluationRubric: dsRubric1,
      passingCriteria: 'Score >= 70% with reproducible data transformations.',
      allowedSubmissionFormats: 'text,zip,ipynb,py,pdf',
      status: 'APPROVED',
    },
  });

  // 6. Seed Demo Interns
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 28);

  const internAlice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: 'INTERN',
      domainId: pythonDomain.id,
    },
  });

  const internBob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      role: 'INTERN',
      domainId: dsDomain.id,
    },
  });

  const internCarol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      name: 'Carol Danvers',
      role: 'INTERN',
      domainId: webDomain.id,
    },
  });

  // 7. Seed Active Internship & Initial Assignment for Alice
  const aliceInternship = await prisma.internship.upsert({
    where: { id: 'internship-alice-py' },
    update: {},
    create: {
      id: 'internship-alice-py',
      internId: internAlice.id,
      domainId: pythonDomain.id,
      startDate: now,
      endDate: nextMonth,
      durationWeeks: 4,
      status: 'ACTIVE',
      progressPercent: 0,
      passingScore: 70,
      maxRevisionAttempts: 2,
      passingRequired: true,
    },
  });

  const aliceDueDate = new Date();
  aliceDueDate.setDate(aliceDueDate.getDate() + 3);

  const aliceAssignment = await prisma.assignment.upsert({
    where: { id: 'assign-alice-task1' },
    update: {},
    create: {
      id: 'assign-alice-task1',
      internshipId: aliceInternship.id,
      taskTemplateId: pyTask1.id,
      sequenceOrder: 1,
      title: pyTask1.title,
      assignedDate: now,
      dueDate: aliceDueDate,
      status: 'PENDING',
    },
  });

  // 8. Seed Initial Simulated Email for Alice
  await prisma.emailOutbox.upsert({
    where: { eventKey: `TASK_ASSIGNED-${aliceAssignment.id}` },
    update: {},
    create: {
      recipientEmail: internAlice.email,
      recipientName: internAlice.name,
      emailType: 'TASK_ASSIGNED',
      subject: `Task 1 Assigned: ${pyTask1.title}`,
      bodyText: `Hello ${internAlice.name},\n\nYour first task "${pyTask1.title}" has been assigned for domain ${pythonDomain.name}.\n\nObjective: ${pyTask1.learningObjective}\nDue Date: ${aliceDueDate.toLocaleDateString()}.\n\nPlease log in to view the full instructions and rubric.`,
      bodyHtml: `<p>Hello ${internAlice.name},</p><p>Your first task <strong>"${pyTask1.title}"</strong> has been assigned for domain <em>${pythonDomain.name}</em>.</p><p><strong>Due Date:</strong> ${aliceDueDate.toLocaleDateString()}</p>`,
      relatedTaskId: aliceAssignment.id,
      relatedInternshipId: aliceInternship.id,
      eventKey: `TASK_ASSIGNED-${aliceAssignment.id}`,
      simulatedStatus: 'SIMULATED_DELIVERED',
      sentAt: now,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

