import { query } from '../db';

const EXPENSE_CATEGORIES = [
  { name: 'Groceries', color: '#22c55e', icon: 'FaShoppingBasket' },
  { name: 'Dining', color: '#f97316', icon: 'FaUtensils' },
  { name: 'Transport', color: '#3b82f6', icon: 'FaCar' },
  { name: 'Utilities', color: '#eab308', icon: 'FaBolt' },
  { name: 'Healthcare', color: '#ef4444', icon: 'FaHeartbeat' },
  { name: 'Entertainment', color: '#a855f7', icon: 'FaFilm' },
  { name: 'Shopping', color: '#ec4899', icon: 'FaShoppingBag' },
  { name: 'Travel', color: '#06b6d4', icon: 'FaPlane' },
  { name: 'Education', color: '#8b5cf6', icon: 'FaGraduationCap' },
  { name: 'Insurance', color: '#14b8a6', icon: 'FaShieldAlt' },
  { name: 'Rent/Mortgage', color: '#6366f1', icon: 'FaHome' },
  { name: 'Subscriptions', color: '#f43f5e', icon: 'FaRedo' },
  { name: 'Personal Care', color: '#d946ef', icon: 'FaSpa' },
  { name: 'Gifts', color: '#f59e0b', icon: 'FaGift' },
  { name: 'Charity', color: '#10b981', icon: 'FaHandsHelping' },
  { name: 'Home Maintenance', color: '#78716c', icon: 'FaTools' },
  { name: 'Clothing', color: '#e879f9', icon: 'FaTshirt' },
  { name: 'Electronics', color: '#0ea5e9', icon: 'FaLaptop' },
  { name: 'Fitness', color: '#84cc16', icon: 'FaDumbbell' },
  { name: 'Pets', color: '#fb923c', icon: 'FaPaw' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', color: '#22c55e', icon: 'FaBriefcase' },
  { name: 'Freelance', color: '#3b82f6', icon: 'FaLaptopCode' },
  { name: 'Investment Returns', color: '#a855f7', icon: 'FaChartLine' },
  { name: 'Rental Income', color: '#f59e0b', icon: 'FaBuilding' },
  { name: 'Other Income', color: '#6b7280', icon: 'FaPlus' },
];

export async function runSeeds() {
  console.log('Running seeds...');

  // Check if system categories already exist
  const existing = await query("SELECT COUNT(*) FROM categories WHERE is_system = true");
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('System categories already seeded, skipping.');
    return;
  }

  for (const cat of EXPENSE_CATEGORIES) {
    await query(
      `INSERT INTO categories (name, type, color, icon, is_system) VALUES ($1, 'expense', $2, $3, true)`,
      [cat.name, cat.color, cat.icon]
    );
  }

  for (const cat of INCOME_CATEGORIES) {
    await query(
      `INSERT INTO categories (name, type, color, icon, is_system) VALUES ($1, 'income', $2, $3, true)`,
      [cat.name, cat.color, cat.icon]
    );
  }

  console.log(`Seeded ${EXPENSE_CATEGORIES.length} expense and ${INCOME_CATEGORIES.length} income categories.`);
}
