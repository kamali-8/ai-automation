import { describe, it, expect } from 'vitest';
import { extractTextFromFile } from '../lib/documents/extractor';
import * as XLSX from 'xlsx';

describe('Document Text Extraction & Error Handling', () => {
  it('extracts text from plain text and markdown files', async () => {
    const mdContent = '# Python Basics\n- Variables\n- Loops\n- Functions';
    const buffer = Buffer.from(mdContent, 'utf-8');

    const result = await extractTextFromFile(buffer, 'syllabus.md');
    expect(result.status).toBe('SUCCESS');
    expect(result.text).toContain('Python Basics');
    expect(result.wordCount).toBeGreaterThan(3);
  });

  it('extracts rows from XLSX spreadsheets', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Topic', 'Hours'],
      ['Pandas DataFrames', 10],
      ['NumPy Arrays', 8],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Topics');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await extractTextFromFile(buffer, 'curriculum.xlsx');
    expect(result.status).toBe('SUCCESS');
    expect(result.text).toContain('Pandas DataFrames');
    expect(result.text).toContain('NumPy Arrays');
  });

  it('flags unsupported file extensions with UNSUPPORTED status', async () => {
    const buffer = Buffer.from('some binary data');
    const result = await extractTextFromFile(buffer, 'archive.rar');

    expect(result.status).toBe('UNSUPPORTED');
    expect(result.error).toContain('Unsupported file format (.rar)');
    expect(result.text).toBe('');
  });

  it('handles empty buffers with FAILED status and clear message', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await extractTextFromFile(emptyBuffer, 'empty.txt');

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('empty');
  });
});

