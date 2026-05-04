export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'this_month':
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      break;
    case 'last_3m':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'last_6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'ytd':
      start.setMonth(0, 1);
      break;
    case 'last_year':
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      end.setMonth(11, 31);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
