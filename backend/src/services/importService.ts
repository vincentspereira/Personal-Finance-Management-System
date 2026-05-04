import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ParsedRow {
  [key: string]: string;
}

export interface ImportPreview {
  headers: string[];
  rows: ParsedRow[];
  detectedMappings: Record<string, string | null>;
  totalRows: number;
  fileType: 'csv' | 'qif';
}

export interface MappedTransaction {
  account_id: string;
  category_id?: string;
  type: 'income' | 'expense';
  amount: number;
  currency?: string;
  description?: string;
  merchant_name?: string;
  transaction_date: string;
  notes?: string;
  tags?: string[];
}

const FIELD_NAMES = [
  'date', 'description', 'amount', 'type', 'category', 'merchant',
  'notes', 'tags', 'currency', 'debit', 'credit',
];

function detectFieldType(header: string): string | null {
  const h = header.toLowerCase().trim();
  if (/date|dt/.test(h) && !/update|create/.test(h)) return 'date';
  if (/description|desc|memo|particular|detail|narration/.test(h)) return 'description';
  if (/amount|amt|value|sum/.test(h) && !/debit|credit/.test(h)) return 'amount';
  if (/debit|withdrawal|expense|spent|out/.test(h)) return 'debit';
  if (/credit|deposit|income|received|in/.test(h)) return 'credit';
  if (/category|cat/.test(h)) return 'category';
  if (/merchant|payee|vendor|store|shop/.test(h)) return 'merchant';
  if (/note|remark/.test(h)) return 'notes';
  if (/tag/.test(h)) return 'tags';
  if (/currency|ccy/.test(h)) return 'currency';
  if (/type|kind/.test(h)) return 'type';
  return null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSV(content: string): ImportPreview {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { headers: [], rows: [], detectedMappings: {}, totalRows: 0, fileType: 'csv' };
  }

  let startIdx = 0;
  // Skip metadata lines (common in bank exports)
  while (startIdx < lines.length && !lines[startIdx].includes(',') && !lines[startIdx].includes('"')) {
    startIdx++;
  }
  if (startIdx >= lines.length) startIdx = 0;

  const headers = parseCSVLine(lines[startIdx]);
  const rows: ParsedRow[] = [];

  const maxRows = Math.min(lines.length - startIdx - 1, 1000);
  for (let i = startIdx + 1; i <= startIdx + maxRows && i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  const detectedMappings: Record<string, string | null> = {};
  headers.forEach(h => {
    detectedMappings[h] = detectFieldType(h);
  });

  return { headers, rows, detectedMappings, totalRows: rows.length, fileType: 'csv' };
}

export function parseQIF(content: string): ImportPreview {
  const rows: ParsedRow[] = [];
  let current: ParsedRow = {};

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '^') {
      if (Object.keys(current).length > 0) {
        rows.push(current);
      }
      current = {};
      continue;
    }
    if (trimmed.length < 2) continue;

    const prefix = trimmed[0];
    const value = trimmed.substring(1);

    switch (prefix) {
      case 'D': current['Date'] = value; break;
      case 'T': current['Amount'] = value; break;
      case 'P': current['Payee'] = value; break;
      case 'M': current['Memo'] = value; break;
      case 'L': current['Category'] = value; break;
      case 'N': current['Number'] = value; break;
      case 'C': current['Cleared'] = value; break;
    }
  }
  if (Object.keys(current).length > 0) rows.push(current);

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const detectedMappings: Record<string, string | null> = {};
  headers.forEach(h => { detectedMappings[h] = detectFieldType(h); });

  return { headers, rows, detectedMappings, totalRows: rows.length, fileType: 'qif' };
}

export function parseImportFile(filePath: string): ImportPreview {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.qif') return parseQIF(content);
  return parseCSV(content);
}

export function mapRowToTransaction(
  row: ParsedRow,
  mappings: Record<string, string>,
  accountId: string,
  defaultType?: 'income' | 'expense',
): MappedTransaction | null {
  const getVal = (field: string): string => {
    for (const [header, mappedField] of Object.entries(mappings)) {
      if (mappedField === field && row[header] !== undefined) return row[header];
    }
    return '';
  };

  let rawDate = getVal('date');
  let rawAmount = getVal('amount');
  const rawDebit = getVal('debit');
  const rawCredit = getVal('credit');
  const description = getVal('description');
  const merchant = getVal('merchant');
  const notes = getVal('notes');
  const tags = getVal('tags');

  // Parse date - try multiple formats
  let transactionDate = '';
  if (rawDate) {
    // Try ISO format first
    const isoMatch = rawDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      transactionDate = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    } else {
      // Try MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = rawDate.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
      if (slashMatch) {
        const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
        transactionDate = `${year}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
      } else {
        transactionDate = rawDate;
      }
    }
  }

  if (!transactionDate) return null;

  // Determine amount and type
  let amount = 0;
  let type: 'income' | 'expense' = defaultType || 'expense';

  if (rawDebit || rawCredit) {
    // Separate debit/credit columns
    const debitVal = parseFloat(rawDebit?.replace(/[,$]/g, '') || '0');
    const creditVal = parseFloat(rawCredit?.replace(/[,$]/g, '') || '0');
    if (debitVal > 0) {
      amount = debitVal;
      type = 'expense';
    } else if (creditVal > 0) {
      amount = creditVal;
      type = 'income';
    } else {
      return null;
    }
  } else if (rawAmount) {
    amount = parseFloat(rawAmount.replace(/[,$]/g, ''));
    if (isNaN(amount) || amount === 0) return null;
    // Negative amounts are expenses, positive are income
    if (amount < 0) {
      amount = Math.abs(amount);
      type = 'expense';
    } else {
      type = 'income';
    }
  } else {
    return null;
  }

  return {
    account_id: accountId,
    type,
    amount: Math.round(amount * 100) / 100,
    description: description || merchant || undefined,
    merchant_name: merchant || undefined,
    transaction_date: transactionDate,
    notes: notes || undefined,
    tags: tags ? tags.split(/[;,]/).map(t => t.trim()).filter(Boolean) : undefined,
  };
}

export function computeImportHash(txn: MappedTransaction): string {
  const raw = `${txn.account_id}|${txn.type}|${txn.amount}|${txn.transaction_date}|${txn.description || ''}|${txn.merchant_name || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}
