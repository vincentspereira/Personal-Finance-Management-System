import { exportTransactions } from './transactionService';
import { getMonthlyReport, getAnnualReport, getCustomReport } from './reportService';

function escapeCSV(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: any[][]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function exportTransactionsCSV(userId: string, filters: {
  startDate?: string;
  endDate?: string;
}) {
  const transactions = await exportTransactions(userId, filters);

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Description', 'Merchant', 'Category', 'Account', 'Tags', 'Source'];
  const rows = transactions.map(t => [
    t.transaction_date,
    t.type,
    t.amount,
    t.currency,
    t.description,
    t.merchant_name,
    t.category_name,
    t.account_name,
    t.tags?.join('; '),
    t.source,
  ]);

  return buildCSV(headers, rows);
}

export async function exportReportCSV(userId: string, reportType: 'monthly' | 'annual' | 'custom', params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}) {
  let report: any;

  if (reportType === 'monthly') {
    const now = new Date();
    report = await getMonthlyReport(userId, params.year || now.getFullYear(), params.month || now.getMonth() + 1);
  } else if (reportType === 'annual') {
    const now = new Date();
    report = await getAnnualReport(userId, params.year || now.getFullYear());
  } else {
    if (!params.startDate || !params.endDate) throw new Error('startDate and endDate required for custom report');
    report = await getCustomReport(userId, params.startDate, params.endDate);
  }

  const sections: string[] = [];

  // Summary section
  sections.push('SUMMARY');
  sections.push(`Period,${report.period.start} to ${report.period.end}`);
  sections.push(`Total Income,$${report.summary?.total_income || 0}`);
  sections.push(`Total Expenses,$${report.summary?.total_expense || 0}`);
  sections.push(`Net,$${report.summary?.net || 0}`);
  sections.push(`Savings Rate,${report.summary?.savings_rate || 0}%`);
  sections.push('');

  // Category breakdown
  if (report.categories?.length > 0) {
    sections.push('CATEGORY BREAKDOWN');
    sections.push('Category,Type,Amount,Percentage,Transaction Count');
    for (const cat of report.categories) {
      sections.push(`${escapeCSV(cat.name)},${cat.type},${cat.total},${cat.percentage || ''},${cat.count || ''}`);
    }
    sections.push('');
  }

  // Merchants
  if (report.merchants?.length > 0) {
    sections.push('TOP MERCHANTS');
    sections.push('Merchant,Total Spent,Transaction Count');
    for (const m of report.merchants) {
      sections.push(`${escapeCSV(m.merchant_name)},${m.total},${m.count}`);
    }
    sections.push('');
  }

  // Monthly breakdown (annual only)
  if (report.monthly_breakdown?.length > 0) {
    sections.push('MONTHLY BREAKDOWN');
    sections.push('Month,Income,Expenses,Net,Transactions');
    for (const m of report.monthly_breakdown) {
      sections.push(`${m.month},${m.income},${m.expense},${m.net},${m.transaction_count}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
