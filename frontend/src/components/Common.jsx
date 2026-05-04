import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

export function KPICard({ title, value, change, prefix = '$', suffix = '', icon: Icon, color = 'accent' }) {
  const isPositive = change >= 0;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        {Icon && <Icon className={`text-${color}`} />}
      </div>
      <div className="text-2xl font-bold">{prefix}{Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}{suffix}</div>
      {change !== null && change !== undefined && (
        <div className={`flex items-center mt-1 text-sm ${isPositive ? 'text-income' : 'text-expense'}`}>
          {isPositive ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
          {Math.abs(change).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}

export function DataTable({ columns, data, onRowClick, emptyMessage = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-700">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-gray-400 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-gray-500">{emptyMessage}</td></tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                className={`border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 sm:p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, color = 'blue' }) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    gray: 'bg-gray-500/20 text-gray-400',
  };
  return <span className={`badge ${colors[color] || colors.blue}`}>{children}</span>;
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function PageHeader({ title, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
