import * as XLSX from 'xlsx';
import path from 'path';

// Generate valid sample roster
const validInterns = [
  { Name: 'David Miller', Email: 'david.miller@example.com', Domain: 'Python Development', 'Start Date': '2026-11-01', 'Duration (Weeks)': 4 },
  { Name: 'Elena Rostova', Email: 'elena.rostova@example.com', Domain: 'Data Science', 'Start Date': '2026-11-03', 'Duration (Weeks)': 6 },
  { Name: 'Frank Zhang', Email: 'frank.zhang@example.com', Domain: 'Web Development', 'Start Date': '2026-11-05', 'Duration (Weeks)': 4 },
  { Name: 'Grace Hopper', Email: 'grace.h@example.com', Domain: 'Python Development', 'Start Date': '2026-11-01', 'Duration (Weeks)': 8 },
];

const wsValid = XLSX.utils.json_to_sheet(validInterns);
const wbValid = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbValid, wsValid, 'Interns');
XLSX.writeFile(wbValid, path.join(process.cwd(), 'sample_interns_valid.xlsx'));

// Generate invalid / mixed sample roster
const mixedInterns = [
  { Name: 'Good Intern', Email: 'good.intern@example.com', Domain: 'Python Development', 'Duration (Weeks)': 4 },
  { Name: 'Duplicate One', Email: 'dup@example.com', Domain: 'Data Science', 'Duration (Weeks)': 4 },
  { Name: 'Duplicate Two', Email: 'dup@example.com', Domain: 'Data Science', 'Duration (Weeks)': 4 }, // duplicate within file
  { Name: 'Alice Johnson', Email: 'alice@example.com', Domain: 'Python Development', 'Duration (Weeks)': 4 }, // already exists in DB
  { Name: 'Invalid Email', Email: 'not-an-email', Domain: 'Web Development', 'Duration (Weeks)': 4 }, // invalid email
  { Name: 'Unknown Domain', Email: 'unknown@example.com', Domain: 'Quantum Cryptography', 'Duration (Weeks)': 4 }, // unknown domain
  { Name: '', Email: 'noname@example.com', Domain: 'Python Development', 'Duration (Weeks)': 4 }, // missing name
];

const wsMixed = XLSX.utils.json_to_sheet(mixedInterns);
const wbMixed = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbMixed, wsMixed, 'Interns');
XLSX.writeFile(wbMixed, path.join(process.cwd(), 'sample_interns_invalid.xlsx'));

console.log('Sample Excel roster files generated.');

