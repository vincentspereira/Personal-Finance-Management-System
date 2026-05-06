import { NavLink, useNavigate } from 'react-router-dom';
import { FaChartBar, FaExchangeAlt, FaCamera, FaChartPie, FaFileAlt, FaWallet, FaCog, FaChevronLeft, FaChevronRight, FaSignOutAlt, FaTimes, FaSun, FaMoon, FaUniversity, FaBullseye } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const nav = [
  { to: '/dashboard', icon: FaChartBar, label: 'Dashboard' },
  { to: '/transactions', icon: FaExchangeAlt, label: 'Transactions' },
  { to: '/accounts', icon: FaUniversity, label: 'Accounts' },
  { to: '/scan', icon: FaCamera, label: 'Scan Invoices' },
  { to: '/analytics', icon: FaChartPie, label: 'Analytics' },
  { to: '/reports', icon: FaFileAlt, label: 'Reports' },
  { to: '/budgets', icon: FaWallet, label: 'Budgets' },
  { to: '/savings-goals', icon: FaBullseye, label: 'Savings Goals' },
  { to: '/settings', icon: FaCog, label: 'Settings' },
];

export default function Sidebar({ open, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <nav className="flex-1 p-2 space-y-1">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onMobileClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-navy-700 hover:text-white'
            }`
          }
        >
          <Icon className="text-lg flex-shrink-0" />
          {(open || mobileOpen) && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  const footerContent = (
    <div className="p-4 border-t border-navy-700">
      <button onClick={toggleTheme} className="flex items-center gap-2 text-gray-400 hover:text-accent text-sm w-full px-2 py-1 mb-2">
        {theme === 'dark' ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
        {(open || mobileOpen) && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>
      {(open || mobileOpen) && user && (
        <div className="mb-2">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      )}
      <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-expense text-sm w-full px-2 py-1">
        <FaSignOutAlt className="text-lg" />
        {(open || mobileOpen) && <span>Sign Out</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-navy-800 border-r border-navy-700 transition-all duration-200 no-print"
        style={{ width: open ? '14rem' : '4rem' }}
      >
        <div className="p-4 flex items-center justify-between border-b border-navy-700">
          {open && <h1 className="text-lg font-bold text-accent">PFMS</h1>}
          <button onClick={onToggle} className="text-gray-400 hover:text-white p-1">
            {open ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>
        {navContent}
        {footerContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative w-64 h-full bg-navy-800 border-r border-navy-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-navy-700">
              <h1 className="text-lg font-bold text-accent">PFMS</h1>
              <button onClick={onMobileClose} className="text-gray-400 hover:text-white p-1">
                <FaTimes />
              </button>
            </div>
            {navContent}
            {footerContent}
          </aside>
        </div>
      )}
    </>
  );
}
