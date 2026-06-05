// src/db/database.js
import * as SQLite from 'expo-sqlite';
import { EXPENSES, TOTAL_FIXED } from '../constants/expenses';

// Upgraded to database file v10 for a fresh, error-free sandbox boot!
const db = SQLite.openDatabaseSync('budgetos15.db');

export function initDatabase() {
  // 1. Settings Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      savings_pct REAL NOT NULL,
      emergency_pct REAL NOT NULL,
      personal_pct REAL NOT NULL DEFAULT 0.20,
      bills_pct REAL NOT NULL DEFAULT 0.60
    );
  `);

  // 2. Expenses Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      priority INTEGER NOT NULL,
      due_day INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  // 3. Income Entries Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      income_type TEXT NOT NULL DEFAULT 'tips',
      note TEXT,
      shift_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Allocations Table 
  db.execSync(`
    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_entry_id INTEGER NOT NULL REFERENCES income_entries(id),
      personal REAL NOT NULL DEFAULT 0,
      savings REAL NOT NULL,
      emergency REAL NOT NULL,
      bills_pool REAL NOT NULL DEFAULT 0,
      discretionary REAL NOT NULL,
      total_bills_covered REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Buckets Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS buckets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal_amount REAL,
      target_date TEXT,
      current_balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#00d4a8',
      created_at TEXT NOT NULL
    );
  `);

  // 6. Bucket Contributions Table 
  db.execSync(`
    CREATE TABLE IF NOT EXISTS bucket_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket_id INTEGER NOT NULL REFERENCES buckets(id),
      amount REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 7. Bill Contributions Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS bill_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL REFERENCES expenses(id),
      income_entry_id INTEGER NOT NULL REFERENCES income_entries(id),
      amount_funded REAL NOT NULL,
      status TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 8. Debt Payments Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 9. User Bills Table (PUBLIC-01 — dynamic bills)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_day INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'Other',
      priority INTEGER NOT NULL DEFAULT 3,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 10. User Debts Table (PUBLIC-02 — dynamic debts)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL NOT NULL,
      apr REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'credit',
      promo_expiry TEXT,
      monthly_min REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // --- SEEDING LOGIC ---
  const existingSettings = db.getFirstSync('SELECT COUNT(*) as count FROM settings');
  if (existingSettings.count === 0) {
    db.runSync(
      'INSERT INTO settings (id, savings_pct, emergency_pct, personal_pct, bills_pct) VALUES (1, ?, ?, ?, ?)',
      [0.15, 0.05, 0.20, 0.60]
    );
  }

  const expenseCount = db.getFirstSync('SELECT COUNT(*) as count FROM expenses');
  if (expenseCount.count === 0) {
    for (const expense of EXPENSES) {
      db.runSync(
        'INSERT INTO expenses (id, name, category, amount, priority, due_day) VALUES (?, ?, ?, ?, ?, ?)',
        [expense.id, expense.name, expense.category, expense.amount, expense.priority, expense.dueDay]
      );
    }
  }

  const userBillCount = db.getFirstSync('SELECT COUNT(*) as count FROM user_bills');
  if (userBillCount.count === 0) {
    const now = new Date().toISOString();
    for (const expense of EXPENSES) {
      db.runSync(
        'INSERT INTO user_bills (id, name, amount, due_day, category, priority, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [expense.id, expense.name, expense.amount, expense.dueDay, expense.category, expense.priority, now]
      );
    }
  }

  const userDebtCount = db.getFirstSync('SELECT COUNT(*) as count FROM user_debts');
  if (userDebtCount.count === 0) {
    const now = new Date().toISOString();
    const seedDebts = [
      { name: 'CITI Card',         balance: 2520.00,  apr: 0,    type: 'promo',       promo_expiry: '2027-02-01', monthly_min: 280 },
      { name: 'Discover IT',       balance: 5250.00,  apr: 0,    type: 'promo',       promo_expiry: '2027-04-04', monthly_min: 0 },
      { name: 'Student Loan 1-02', balance: 5500.00,  apr: 6.53, type: 'student',     promo_expiry: null,         monthly_min: 0 },
      { name: 'Student Loan 1-03', balance: 5500.00,  apr: 6.39, type: 'student',     promo_expiry: null,         monthly_min: 0 },
      { name: 'Student Loan 1-01', balance: 4500.00,  apr: 5.50, type: 'student',     promo_expiry: null,         monthly_min: 0 },
      { name: 'Truck Loan',        balance: 41951.58, apr: 4.99, type: 'installment', promo_expiry: null,         monthly_min: 676.83 },
    ];
    for (const d of seedDebts) {
      db.runSync(
        'INSERT INTO user_debts (name, balance, apr, type, promo_expiry, monthly_min, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [d.name, d.balance, d.apr, d.type, d.promo_expiry, d.monthly_min, now]
      );
    }
  }

  const bucketCount = db.getFirstSync('SELECT COUNT(*) as count FROM buckets');
  if (bucketCount.count === 0) {
    const now = new Date().toISOString();
    db.runSync(
      'INSERT INTO buckets (name, goal_amount, current_balance, color, created_at) VALUES (?, ?, ?, ?, ?)',
      ['Emergency Fund', parseFloat((TOTAL_FIXED * 4).toFixed(2)), 0, '#ff9f43', now]
    );
    db.runSync(
      'INSERT INTO buckets (name, goal_amount, current_balance, color, created_at) VALUES (?, ?, ?, ?, ?)',
      ['Unexpected Expenses', 500, 0, '#7b61ff', now]
    );
  }
}

export function saveIncomeAndAllocation(incomeAmount, incomeType, note, shiftDate, allocationResult) {
  const now = new Date().toISOString();
  
  // 1. Log Income Entry
  const incomeEntry = db.runSync(
    'INSERT INTO income_entries (amount, income_type, note, shift_date, created_at) VALUES (?, ?, ?, ?, ?)',
    [incomeAmount, incomeType, note, shiftDate, now]
  );
  const entryId = incomeEntry.lastInsertRowId;

  // 2. Log Master Allocation Allocation
  db.runSync(
    `INSERT INTO allocations 
      (income_entry_id, personal, savings, emergency, bills_pool, 
       discretionary, total_bills_covered, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entryId,
      allocationResult.personal,
      allocationResult.savings,
      allocationResult.emergency,
      allocationResult.billsPool,
      allocationResult.discretionary,
      allocationResult.totalBillsCovered,
      now,
    ]
  );

  // 3. Log Target Bill Progress
  const allBills = [
    ...allocationResult.funded,
    ...allocationResult.partial,
    ...allocationResult.unfunded,
  ];

  for (const bill of allBills) {
    db.runSync(
      `INSERT INTO bill_contributions 
        (expense_id, income_entry_id, amount_funded, status, shift_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bill.id, entryId, bill.amountFunded || 0, bill.status, shiftDate, now]
    );
  }

  // 4. Mirror Savings Allocation Natively into Unexpected Expenses Bucket
  if (allocationResult.savings > 0) {
    const savingsBucket = db.getFirstSync("SELECT id FROM buckets WHERE name = 'Unexpected Expenses'");
    if (savingsBucket) {
      db.runSync(
        'INSERT INTO bucket_contributions (bucket_id, amount, note, created_at) VALUES (?, ?, ?, ?)', 
        [savingsBucket.id, allocationResult.savings, `Shift allocation (${shiftDate})`, now]
      );
      db.runSync(
        'UPDATE buckets SET current_balance = current_balance + ? WHERE id = ?', 
        [allocationResult.savings, savingsBucket.id]
      );
    }
  }

  // 5. Mirror Emergency Allocation Natively into Emergency Fund Bucket
  if (allocationResult.emergency > 0) {
    const emergencyBucket = db.getFirstSync("SELECT id FROM buckets WHERE name = 'Emergency Fund'");
    if (emergencyBucket) {
      db.runSync(
        'INSERT INTO bucket_contributions (bucket_id, amount, note, created_at) VALUES (?, ?, ?, ?)', 
        [emergencyBucket.id, allocationResult.emergency, `Shift allocation (${shiftDate})`, now]
      );
      db.runSync(
        'UPDATE buckets SET current_balance = current_balance + ? WHERE id = ?', 
        [allocationResult.emergency, emergencyBucket.id]
      );
    }
  }

  return entryId;
}

export function getSettings() {
  return db.getFirstSync('SELECT * FROM settings WHERE id = 1');
}

export function updateSettings(savingsPct, emergencyPct, personalPct = 0.2, billsPct = 0.6) {
  db.runSync(
    'UPDATE settings SET savings_pct = ?, emergency_pct = ?, personal_pct = ?, bills_pct = ? WHERE id = 1',
    [savingsPct, emergencyPct, personalPct, billsPct]
  );
}

export function getBuckets() {
  return db.getAllSync('SELECT * FROM buckets ORDER BY created_at ASC');
}

export function addToBucket(bucketId, amount, note) {
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO bucket_contributions (bucket_id, amount, note, created_at) VALUES (?, ?, ?, ?)',
    [bucketId, amount, note, now]
  );
  db.runSync(
    'UPDATE buckets SET current_balance = current_balance + ? WHERE id = ?',
    [amount, bucketId]
  );
}

export function createBucket(name, goalAmount, targetDate, color) {
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO buckets (name, goal_amount, target_date, current_balance, color, created_at) VALUES (?, ?, ?, 0, ?, ?)',
    [name, goalAmount, targetDate, color, now]
  );
}

export function getMonthlyTotals() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;

  return db.getFirstSync(`
    SELECT
      COUNT(i.id) as shift_count,
      COALESCE(SUM(i.amount), 0) as total_income,
      COALESCE(SUM(a.personal), 0) as total_personal,
      COALESCE(SUM(a.savings), 0) as total_savings,
      COALESCE(SUM(a.emergency), 0) as total_emergency,
      COALESCE(SUM(a.bills_pool), 0) as total_bills_pool,
      COALESCE(SUM(a.total_bills_covered), 0) as total_bills_covered
    FROM income_entries i
    JOIN allocations a ON a.income_entry_id = i.id
    WHERE i.created_at LIKE ? || '%'
  `, [prefix]);
}

export function getMonthlyBillProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;

  return db.getAllSync(`
    SELECT
      ub.id,
      ub.name,
      ub.amount as target,
      ub.priority,
      ub.due_day,
      ub.category,
      COALESCE(SUM(bc.amount_funded), 0) as funded_total,
      COALESCE(SUM(bc.amount_funded) / ub.amount * 100, 0) as pct_funded
    FROM user_bills ub
    LEFT JOIN bill_contributions bc
      ON bc.expense_id = ub.id
      AND bc.shift_date LIKE ? || '%'
    WHERE ub.active = 1
    GROUP BY ub.id
    ORDER BY ub.priority ASC, ub.due_day ASC
  `, [prefix]);
}

export function getHistory() {
  return db.getAllSync(`
    SELECT
      i.id,
      i.amount,
      i.income_type,
      i.note,
      i.shift_date,
      i.created_at,
      a.personal,
      a.savings,
      a.emergency,
      a.bills_pool,
      a.discretionary,
      a.total_bills_covered
    FROM income_entries i
    JOIN allocations a ON a.income_entry_id = i.id
    ORDER BY i.shift_date DESC
  `);
}

export function updateBucket(id, name, goalAmount, targetDate) {
  db.runSync(
    'UPDATE buckets SET name = ?, goal_amount = ?, target_date = ? WHERE id = ?',
    [name, goalAmount, targetDate || null, id]
  );
}

export function deleteBucket(id) {
  db.runSync('DELETE FROM bucket_contributions WHERE bucket_id = ?', [id]);
  db.runSync('DELETE FROM buckets WHERE id = ?', [id]);
}

export function addManualBillContribution(expenseId, amount, shiftDate) {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO bill_contributions
      (expense_id, income_entry_id, amount_funded, status, shift_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [expenseId, -1, amount, 'manual', shiftDate, now]
  );
}

export function addDebtPayment(debtName, amount, date) {
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO debt_payments (debt_name, amount, date, created_at) VALUES (?, ?, ?, ?)',
    [debtName, amount, date, now]
  );
}

export function getDebtPaymentTotals() {
  const rows = db.getAllSync(
    'SELECT debt_name, COALESCE(SUM(amount), 0) as total FROM debt_payments GROUP BY debt_name'
  );
  const map = {};
  rows.forEach(r => { map[r.debt_name] = r.total; });
  return map;
}

export function getRecentBillContributions(expenseId) {
  return db.getAllSync(
    `SELECT id, amount_funded, shift_date FROM bill_contributions
     WHERE expense_id = ? AND status = 'manual'
     ORDER BY created_at DESC LIMIT 5`,
    [expenseId]
  );
}

export function deleteBillContribution(id) {
  db.runSync('DELETE FROM bill_contributions WHERE id = ?', [id]);
}

export function getRecentBucketContributions(bucketId) {
  return db.getAllSync(
    `SELECT id, amount, created_at FROM bucket_contributions
     WHERE bucket_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [bucketId]
  );
}

export function deleteBucketContribution(id, amount, bucketId) {
  db.runSync('DELETE FROM bucket_contributions WHERE id = ?', [id]);
  db.runSync(
    'UPDATE buckets SET current_balance = MAX(0, current_balance - ?) WHERE id = ?',
    [amount, bucketId]
  );
}

export function getRecentDebtPayments(debtName) {
  return db.getAllSync(
    `SELECT id, amount, date FROM debt_payments
     WHERE debt_name = ?
     ORDER BY created_at DESC LIMIT 5`,
    [debtName]
  );
}

export function deleteDebtPayment(id) {
  db.runSync('DELETE FROM debt_payments WHERE id = ?', [id]);
}

export function getUserBills() {
  return db.getAllSync(
    'SELECT id, name, amount, due_day, category, priority FROM user_bills WHERE active = 1 ORDER BY priority ASC, due_day ASC'
  ).map(b => ({ ...b, dueDay: b.due_day }));
}

export function addUserBill(name, amount, dueDay, category, priority) {
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO user_bills (name, amount, due_day, category, priority, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
    [name, amount, dueDay, category, priority, now]
  );
}

export function updateUserBill(id, name, amount, dueDay, category, priority) {
  db.runSync(
    'UPDATE user_bills SET name = ?, amount = ?, due_day = ?, category = ?, priority = ? WHERE id = ?',
    [name, amount, dueDay, category, priority, id]
  );
}

export function deleteUserBill(id) {
  db.runSync('UPDATE user_bills SET active = 0 WHERE id = ?', [id]);
}

export function getUserDebts() {
  return db.getAllSync('SELECT * FROM user_debts WHERE active = 1 ORDER BY id ASC');
}

export function addUserDebt(name, balance, apr, type, promoExpiry, monthlyMin) {
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO user_debts (name, balance, apr, type, promo_expiry, monthly_min, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    [name, balance, apr, type, promoExpiry || null, monthlyMin, now]
  );
}

export function updateUserDebt(id, name, balance, apr, type, promoExpiry, monthlyMin) {
  db.runSync(
    'UPDATE user_debts SET name = ?, balance = ?, apr = ?, type = ?, promo_expiry = ?, monthly_min = ? WHERE id = ?',
    [name, balance, apr, type, promoExpiry || null, monthlyMin, id]
  );
}

export function deleteUserDebt(id) {
  db.runSync('UPDATE user_debts SET active = 0 WHERE id = ?', [id]);
}