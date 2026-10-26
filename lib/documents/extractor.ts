import path from 'path';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export interface ExtractionResult {
  status: 'SUCCESS' | 'FAILED' | 'UNSUPPORTED';
  text: string;
  wordCount: number;
  error?: string;
}

/**
 * Extracts plain text from various file formats:
 * - PDF (.pdf) via pdfjs-dist
 * - Word (.docx) via mammoth
 * - Excel / CSV (.xlsx, .xls, .csv) via xlsx
 * - Markdown / Text (.md, .txt) via utf-8 decoding
 * Other formats return status 'UNSUPPORTED' with a clear message.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  if (!buffer || buffer.length === 0) {
    return {
      status: 'FAILED',
      text: '',
      wordCount: 0,
      error: 'File is empty (0 bytes).',
    };
  }

  try {
    switch (ext) {
      case 'txt':
      case 'md': {
        const text = buffer.toString('utf-8').trim();
        if (!text) {
          return { status: 'FAILED', text: '', wordCount: 0, error: 'Document contains no text content.' };
        }
        return {
          status: 'SUCCESS',
          text,
          wordCount: countWords(text),
        };
      }

      case 'docx': {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value.trim();
        if (!text) {
          return {
            status: 'FAILED',
            text: '',
            wordCount: 0,
            error: 'DOCX document contains no readable text or is corrupted.',
          };
        }
        return {
          status: 'SUCCESS',
          text,
          wordCount: countWords(text),
        };
      }

      case 'xlsx':
      case 'xls':
      case 'csv': {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return {
            status: 'FAILED',
            text: '',
            wordCount: 0,
            error: 'Spreadsheet has no sheets or unreadable data.',
          };
        }

        const lines: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          lines.push(`--- Sheet: ${sheetName} ---`);
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv && csv.trim()) {
            lines.push(csv.trim());
          }
        }

        const text = lines.join('\n\n').trim();
        if (!text || text.length < 5) {
          return {
            status: 'FAILED',
            text: '',
            wordCount: 0,
            error: 'Spreadsheet contains no text rows.',
          };
        }

        return {
          status: 'SUCCESS',
          text,
          wordCount: countWords(text),
        };
      }

      case 'pdf': {
        try {
          // Dynamic import of pdfjs-dist for Node environment
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
          
          const uint8Array = new Uint8Array(buffer);
          const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            disableFontFace: true,
            useSystemFonts: true,
          });

          const doc = await loadingTask.promise;
          const numPages = doc.numPages;
          const pageTexts: string[] = [];

          for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const strings = (content.items as Array<{ str?: string }>)
              .map((item) => item.str || '')
              .filter(Boolean);
            if (strings.length > 0) {
              pageTexts.push(`--- Page ${i} ---\n` + strings.join(' '));
            }
          }

          const text = pageTexts.join('\n\n').trim();
          if (!text) {
            return {
              status: 'FAILED',
              text: '',
              wordCount: 0,
              error: 'PDF contains no selectable or readable text (may be scanned or image-only).',
            };
          }

          return {
            status: 'SUCCESS',
            text,
            wordCount: countWords(text),
          };
        } catch (pdfErr: unknown) {
          return {
            status: 'FAILED',
            text: '',
            wordCount: 0,
            error: `PDF extraction failed: ${pdfErr instanceof Error ? pdfErr.message : 'Corrupted or encrypted PDF'}`,
          };
        }
      }

      default: {
        return {
          status: 'UNSUPPORTED',
          text: '',
          wordCount: 0,
          error: `Unsupported file format (.${ext}). Only PDF, DOCX, TXT, MD, XLSX, and CSV are supported.`,
        };
      }
    }
  } catch (err: unknown) {
    return {
      status: 'FAILED',
      text: '',
      wordCount: 0,
      error: `Failed to extract text: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}
