import { parseCSV, parseQIF, mapRowToTransaction } from '../../../src/services/importService';

describe('importService', () => {
  describe('parseCSV', () => {
    it('parses basic CSV with headers', () => {
      const csv = 'Date,Description,Amount\n2026-01-15,Coffee,5.00\n2026-01-16,Groceries,42.50';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
      expect(result.totalRows).toBe(2);
      expect(result.rows[0]).toEqual({ Date: '2026-01-15', Description: 'Coffee', Amount: '5.00' });
      expect(result.fileType).toBe('csv');
    });

    it('detects column types from headers', () => {
      const csv = 'Transaction Date,Description,Debit,Credit\n2026-01-15,Coffee,5.00,';
      const result = parseCSV(csv);

      expect(result.detectedMappings['Transaction Date']).toBe('date');
      expect(result.detectedMappings['Description']).toBe('description');
      expect(result.detectedMappings['Debit']).toBe('debit');
      expect(result.detectedMappings['Credit']).toBe('credit');
    });

    it('handles quoted fields with commas', () => {
      const csv = 'Date,Description,Amount\n2026-01-15,"Coffee, large",5.00';
      const result = parseCSV(csv);

      expect(result.rows[0].Description).toBe('Coffee, large');
    });

    it('handles empty CSV', () => {
      const csv = '';
      const result = parseCSV(csv);

      expect(result.totalRows).toBe(0);
      expect(result.headers).toEqual([]);
    });

    it('skips metadata lines at the top', () => {
      const csv = 'Bank Statement\nAccount: 12345\nDate,Description,Amount\n2026-01-15,Coffee,5.00';
      const result = parseCSV(csv);

      expect(result.totalRows).toBe(1);
      expect(result.rows[0].Date).toBe('2026-01-15');
    });

    it('limits to 1000 rows', () => {
      const lines = ['Date,Amount'];
      for (let i = 0; i < 1500; i++) {
        lines.push(`2026-01-${(i % 28) + 1},10.00`);
      }
      const result = parseCSV(lines.join('\n'));
      expect(result.totalRows).toBe(1000);
    });
  });

  describe('parseQIF', () => {
    it('parses QIF format', () => {
      const qif = `D1/15/2026\nT-5.00\nPStarbucks\nMCoffee\n^\nD1/16/2026\nT3000.00\nPEmployer\nMSalary\n^`;
      const result = parseQIF(qif);

      expect(result.fileType).toBe('qif');
      expect(result.totalRows).toBe(2);
      expect(result.rows[0]).toEqual({
        Date: '1/15/2026', Amount: '-5.00', Payee: 'Starbucks', Memo: 'Coffee',
      });
    });

    it('handles empty QIF', () => {
      const result = parseQIF('');
      expect(result.totalRows).toBe(0);
    });
  });

  describe('mapRowToTransaction', () => {
    it('maps CSV row with single amount column', () => {
      const row = { Date: '2026-01-15', Description: 'Coffee', Amount: '-5.00' };
      const mappings = { Date: 'date', Description: 'description', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');

      expect(result).toEqual(expect.objectContaining({
        account_id: 'acc-1',
        type: 'expense',
        amount: 5.0,
        transaction_date: '2026-01-15',
        description: 'Coffee',
      }));
    });

    it('maps positive amount as income', () => {
      const row = { Date: '2026-01-15', Description: 'Salary', Amount: '3000' };
      const mappings = { Date: 'date', Description: 'description', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');

      expect(result?.type).toBe('income');
      expect(result?.amount).toBe(3000);
    });

    it('maps debit/credit columns', () => {
      const row = { Date: '2026-01-15', Description: 'Groceries', Debit: '42.50', Credit: '' };
      const mappings = { Date: 'date', Description: 'description', Debit: 'debit', Credit: 'credit' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');

      expect(result?.type).toBe('expense');
      expect(result?.amount).toBe(42.5);
    });

    it('maps credit column as income', () => {
      const row = { Date: '2026-01-15', Debit: '', Credit: '500' };
      const mappings = { Date: 'date', Debit: 'debit', Credit: 'credit' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');

      expect(result?.type).toBe('income');
      expect(result?.amount).toBe(500);
    });

    it('returns null when date is missing', () => {
      const row = { Description: 'No date', Amount: '10' };
      const mappings = { Description: 'description', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result).toBeNull();
    });

    it('returns null when amount is zero or invalid', () => {
      const row = { Date: '2026-01-15', Amount: '0' };
      const mappings = { Date: 'date', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result).toBeNull();
    });

    it('parses MM/DD/YYYY date format', () => {
      const row = { Date: '01/15/2026', Amount: '10' };
      const mappings = { Date: 'date', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result?.transaction_date).toBe('2026-01-15');
    });

    it('strips currency symbols from amount', () => {
      const row = { Date: '2026-01-15', Amount: '$1,234.56' };
      const mappings = { Date: 'date', Amount: 'amount' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result?.amount).toBe(1234.56);
    });

    it('parses tags from comma-separated string', () => {
      const row = { Date: '2026-01-15', Amount: '10', Tags: 'food,lunch' };
      const mappings = { Date: 'date', Amount: 'amount', Tags: 'tags' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result?.tags).toEqual(['food', 'lunch']);
    });

    it('uses merchant as fallback description', () => {
      const row = { Date: '2026-01-15', Amount: '10', Merchant: 'Amazon' };
      const mappings = { Date: 'date', Amount: 'amount', Merchant: 'merchant' };

      const result = mapRowToTransaction(row, mappings, 'acc-1');
      expect(result?.description).toBe('Amazon');
    });
  });
});
