// src/constants/expenses.js
// All amounts are monthly equivalents
// Prioriry: 1 = critical, 2 = high, 3 = normal, 4 = low

export const DEFAULT_SETTINGS = {
    savingsPct: 0.15,   //15% of every deposit goes to savings
    emergencyPct: 0.05,   //5% of every deposit goes to emergency fund
};

export const EXPENSES = [
    // ── CRITICAL ──────────────────────────────────────────
    { id: 1,  name: 'Mortgage',            category: 'Housing',       amount: 625.00,  priority: 1, dueDay: 12 },
    { id: 2,  name: 'Car Payment',         category: 'Transport',     amount: 676.83,  priority: 1, dueDay: 29 },
    { id: 3,  name: 'Insurance',           category: 'Utilities',     amount: 149.25,  priority: 1, dueDay: 15 },
    

    // ── HIGH ──────────────────────────────────────────────
    { id: 5,  name: 'Electricity',         category: 'Utilities',     amount: 84.00,   priority: 2, dueDay: 25 },
    { id: 6,  name: 'Phone',               category: 'Utilities',     amount: 90.00,   priority: 2, dueDay: 13 },
    { id: 7,  name: 'Internet',            category: 'Utilities',     amount: 17.50,   priority: 2, dueDay: 8  },
    { id: 8,  name: 'Car Gas',             category: 'Transport',     amount: 165.00,  priority: 2, dueDay: 30 },
    { id: 9,  name: 'Gas',                 category: 'Utilities',     amount: 20.00,   priority: 2, dueDay: 22 },
    { id: 10, name: 'Water',               category: 'Utilities',     amount: 13.00,   priority: 2, dueDay: 15 },

    // ── NORMAL ────────────────────────────────────────────
    { id: 11, name: 'Gym',                 category: 'Health',        amount: 27.49,   priority: 3, dueDay: 18 },
    { id: 12, name: 'CITI Card',           category: 'Debt',          amount: 280.00,  priority: 3, dueDay: 15 },
    { id: 13, name: 'AMEX Annual Fee',     category: 'Shopping',      amount: 27.08,   priority: 3, dueDay: 27 },
    { id: 14, name: 'Chase SP Annual Fee', category: 'Shopping',      amount: 7.92,    priority: 3, dueDay: 1  },
    
    
    // ── LOW ───────────────────────────────────────────────
    { id: 16, name: 'Netflix',             category: 'Entertainment', amount: 7.00,    priority: 4, dueDay: 22 },
    { id: 17, name: 'Claude',              category: 'Software',      amount: 21.95,   priority: 4, dueDay: 16 },
    { id: 18, name: 'Hulu',               category: 'Entertainment', amount: 2.12,    priority: 4, dueDay: 23 },
    { id: 19, name: 'HBO Max',             category: 'Entertainment', amount: 6.02,    priority: 4, dueDay: 30 },
    { id: 20, name: 'YouTube Premium',     category: 'Entertainment', amount: 8.77,    priority: 4, dueDay: 3  },
    { id: 21, name: 'Audible',             category: 'Entertainment', amount: 8.50,    priority: 4, dueDay: 27 },
    { id: 15, name: 'Amazon Prime',        category: 'Shopping',      amount: 8.22,    priority: 4, dueDay: 22 },
];
export const TOTAL_FIXED = EXPENSES.reduce((sum,e) => sum + e.amount, 0);
//Should equal 2786.15