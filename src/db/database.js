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
      e.id,
      e.name,
      e.amount as target,
      e.priority,
      e.due_day,
      e.category,
      COALESCE(SUM(bc.amount_funded), 0) as funded_total,
      COALESCE(SUM(bc.amount_funded) / e.amount * 100, 0) as pct_funded
    FROM expenses e
    LEFT JOIN bill_contributions bc 
      ON bc.expense_id = e.id 
      AND bc.shift_date LIKE ? || '%'
    GROUP BY e.id
    ORDER BY e.priority ASC, e.due_day ASC
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

export function updateBucket(id, name, goalAmount) {
  db.runSync(
    'UPDATE buckets SET name = ?, goal_amount = ? WHERE id = ?',
    [name, goalAmount, id]
  );
}

export function deleteBucket(id) {
  db.runSync('DELETE FROM bucket_contributions WHERE bucket_id = ?', [id]);
  db.runSync('DELETE FROM buckets WHERE id = ?', [id]);
}