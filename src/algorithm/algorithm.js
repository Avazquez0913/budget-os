// src/algorithm/algorithm.js
import { EXPENSES } from '../constants/expenses';

// ── HELPERS ───────────────────────────────────────────
function daysUntilDue(dueDay) {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  const target = thisMonth >= today ? thisMonth : nextMonth;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getDueLabel(daysLeft) {
  if (daysLeft <= 0)  return 'OVERDUE';
  if (daysLeft <= 3)  return 'DUE NOW';
  if (daysLeft <= 7)  return 'DUE SOON';
  if (daysLeft <= 14) return 'THIS WEEK';
  return 'LATER';
}

// ── MAIN ALLOCATE ─────────────────────────────────────
export function allocate(incomeAmount, incomeType = 'tips', settings = null) {
  const pct = settings || { personal: 0.20, savings: 0.15, emergency: 0.05, bills: 0.60 };

  const personal  = parseFloat((incomeAmount * pct.personal).toFixed(2));
  const savings   = parseFloat((incomeAmount * pct.savings).toFixed(2));
  const emergency = parseFloat((incomeAmount * pct.emergency).toFixed(2));
  const billsPool = parseFloat((incomeAmount * pct.bills).toFixed(2));

  // ── INSTALLMENT LOGIC ────────────────────────────────
  // Sort by urgency (days until due) first, then priority, then amount
  const enriched = EXPENSES.map(e => ({
    ...e,
    daysLeft: daysUntilDue(e.dueDay),
    dueLabel: getDueLabel(daysUntilDue(e.dueDay)),
  }));

  const sorted = [...enriched].sort((a, b) => {
    // overdue always first
    if (a.daysLeft <= 0 && b.daysLeft > 0) return -1;
    if (b.daysLeft <= 0 && a.daysLeft > 0) return 1;
    // then by priority tier
    if (a.priority !== b.priority) return a.priority - b.priority;
    // within same priority, due sooner goes first
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    // tiebreak: smaller amount first (more bills get fully funded)
    return a.amount - b.amount;
  });

  let pool = billsPool;
  const funded   = [];
  const partial  = [];
  const unfunded = [];

  for (const expense of sorted) {
    if (pool >= expense.amount) {
      funded.push({ ...expense, status: 'funded', amountFunded: expense.amount });
      pool -= expense.amount;
    } else if (pool > 0) {
      partial.push({
        ...expense,
        status:       'partial',
        amountFunded: parseFloat(pool.toFixed(2)),
        amountNeeded: parseFloat((expense.amount - pool).toFixed(2)),
        pctFunded:    parseFloat(((pool / expense.amount) * 100).toFixed(1)),
      });
      pool = 0;
    } else {
      unfunded.push({ ...expense, status: 'unfunded', amountFunded: 0 });
    }
  }

  const discretionary      = parseFloat(pool.toFixed(2));
  const totalBillsCovered  = parseFloat(funded.reduce((s, e) => s + e.amount, 0).toFixed(2));

  // ── AGENT EXPLANATION ────────────────────────────────
  const explanation = buildExplanation({
    incomeAmount, personal, savings, emergency,
    billsPool, funded, partial, unfunded, discretionary,
  });

  return {
    incomeAmount,
    incomeType,
    personal,
    savings,
    emergency,
    billsPool,
    funded,
    partial,
    unfunded,
    discretionary,
    totalBillsCovered,
    explanation,
  };
}

// ── AGENT EXPLANATION BUILDER ─────────────────────────
function buildExplanation({ incomeAmount, personal, savings, emergency,
  billsPool, funded, partial, unfunded, discretionary }) {

  const lines = [];

  lines.push(`Here's what we did with your $${incomeAmount.toFixed(2)}:`);
  lines.push(`→ $${personal.toFixed(2)} is yours — spend it, you earned it.`);
  lines.push(`→ $${savings.toFixed(2)} went to savings.`);
  lines.push(`→ $${emergency.toFixed(2)} went to your emergency fund.`);
  lines.push(`→ $${billsPool.toFixed(2)} went toward your bills:`);

  if (funded.length > 0) {
    const dueSoon = funded.filter(e => e.daysLeft <= 7);
    if (dueSoon.length > 0) {
      const names = dueSoon.map(e => e.name).join(', ');
      lines.push(`   ✓ Fully covered: ${names} — due within 7 days.`);
    }
    const notUrgent = funded.filter(e => e.daysLeft > 7);
    if (notUrgent.length > 0) {
      lines.push(`   ✓ Also covered: ${notUrgent.map(e => e.name).join(', ')}.`);
    }
  }

  if (partial.length > 0) {
    const p = partial[0];
    lines.push(`   ◑ ${p.pctFunded}% toward ${p.name} — $${p.amountNeeded.toFixed(2)} still needed.`);
  }

  if (unfunded.length > 0) {
    lines.push(`   ○ ${unfunded.length} bills still need funding this month.`);
  }

  if (discretionary > 0) {
    lines.push(`→ $${discretionary.toFixed(2)} left over — add it to a savings bucket or keep it.`);
  }

  return lines.join('\n');
}

// ── MONTHLY SUMMARY ───────────────────────────────────
export function getMonthlySummary(historyEntries) {
  if (!historyEntries || !historyEntries.length) return null;

  const now       = new Date();
  const thisMonth = historyEntries.filter(h => {
    const d = new Date(h.created_at);
    return d.getMonth()    === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  });

  if (!thisMonth.length) return null;

  const totalIncome   = thisMonth.reduce((s, h) => s + h.amount, 0);
  const totalSavings  = thisMonth.reduce((s, h) => s + h.savings, 0);
  const totalEmergency= thisMonth.reduce((s, h) => s + h.emergency, 0);
  const totalBills    = thisMonth.reduce((s, h) => s + h.total_bills_covered, 0);
  const totalPersonal = thisMonth.reduce((s, h) => s + (h.personal || h.amount * 0.20), 0);
  const shiftCount    = thisMonth.length;
  const avgShift      = totalIncome / shiftCount;
  const TOTAL_BILLS   = 2786.15;
  const billsCoverage = Math.min((totalBills / TOTAL_BILLS) * 100, 100);
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth    = now.getDate();
  const projectedIncome = (totalIncome / dayOfMonth) * daysInMonth;
  const projectedBills  = projectedIncome * 0.60;

  return {
    totalIncome:      parseFloat(totalIncome.toFixed(2)),
    totalSavings:     parseFloat(totalSavings.toFixed(2)),
    totalEmergency:   parseFloat(totalEmergency.toFixed(2)),
    totalBills:       parseFloat(totalBills.toFixed(2)),
    totalPersonal:    parseFloat(totalPersonal.toFixed(2)),
    shiftCount,
    avgShift:         parseFloat(avgShift.toFixed(2)),
    billsCoverage:    parseFloat(billsCoverage.toFixed(1)),
    billsRemaining:   parseFloat((TOTAL_BILLS - totalBills).toFixed(2)),
    projectedIncome:  parseFloat(projectedIncome.toFixed(2)),
    projectedBills:   parseFloat(projectedBills.toFixed(2)),
    willCoverBills:   projectedBills >= TOTAL_BILLS,
  };
}

// ── INSIGHTS ──────────────────────────────────────────
export function getInsights(historyEntries) {
  if (!historyEntries || !historyEntries.length) return null;

  const amounts   = historyEntries.map(h => h.amount);
  const bestShift = Math.max(...amounts);
  const worstShift= Math.min(...amounts);
  const avgShift  = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const totalEarned = amounts.reduce((s, a) => s + a, 0);

  // best week
  const byWeek = {};
  historyEntries.forEach(h => {
    const d    = new Date(h.created_at);
    const week = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
    byWeek[week] = (byWeek[week] || 0) + h.amount;
  });
  const bestWeek = Math.max(...Object.values(byWeek));

  // average by day of week
  const byDow = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  historyEntries.forEach(h => {
    const dow = new Date(h.created_at).getDay();
    byDow[dow].push(h.amount);
  });
  const dowNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowAvgs   = dowNames.map((name, i) => ({
    name,
    avg: byDow[i].length
      ? parseFloat((byDow[i].reduce((s,a) => s+a,0) / byDow[i].length).toFixed(2))
      : 0,
    shifts: byDow[i].length,
  }));
  const bestDay   = dowAvgs.reduce((best, d) => d.avg > best.avg ? d : best, dowAvgs[0]);

  return {
    bestShift:   parseFloat(bestShift.toFixed(2)),
    worstShift:  parseFloat(worstShift.toFixed(2)),
    avgShift:    parseFloat(avgShift.toFixed(2)),
    bestWeek:    parseFloat(bestWeek.toFixed(2)),
    bestDay,
    dowAvgs,
    totalShifts: historyEntries.length,
    totalEarned: parseFloat(totalEarned.toFixed(2)),
  };
}

// ── DEBT COUNTDOWN ────────────────────────────────────
export function getDebtCountdown() {
  const target   = new Date('2027-02-01');
  const now      = new Date();
  const msLeft   = target - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const months   = Math.ceil(daysLeft / 30);
  return {
    daysLeft,
    months,
    freedPerMonth: 280.00,
    card: 'CITI Card',
  };
}