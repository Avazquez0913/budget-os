// src/algorithm/algorithm.js
import { EXPENSES, TOTAL_FIXED } from '../constants/expenses';

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

export function allocate(incomeAmount, incomeType = 'tips', settings = null, monthlyProgress = []) {
  const pct = settings || { personal: 0.20, savings: 0.15, emergency: 0.05, bills: 0.60 };

  const personal  = parseFloat((incomeAmount * pct.personal).toFixed(2));
  const savings   = parseFloat((incomeAmount * pct.savings).toFixed(2));
  const emergency = parseFloat((incomeAmount * pct.emergency).toFixed(2));
  const billsPool = parseFloat((incomeAmount * pct.bills).toFixed(2));

  // build lookup of already funded amounts this month
  const alreadyFundedMap = {};
  monthlyProgress.forEach(b => {
    alreadyFundedMap[b.id] = parseFloat((b.funded_total || 0).toFixed(2));
  });

  // enrich each expense with daily accrual data
  const enriched = EXPENSES.map(e => {
    const alreadyFunded = alreadyFundedMap[e.id] || 0;
    const stillNeed     = parseFloat(Math.max(e.amount - alreadyFunded, 0).toFixed(2));
    const daysLeft      = daysUntilDue(e.dueDay);
    // daily rate = what's still needed divided by days remaining
    // minimum 1 day to avoid division by zero
    const dailyRate     = parseFloat((stillNeed / Math.max(daysLeft, 1)).toFixed(2));

    return {
      ...e,
      daysLeft,
      dueLabel:       getDueLabel(daysLeft),
      stillNeed,
      alreadyFunded,
      dailyRate,
      isFullyCovered: stillNeed === 0,
    };
  });

  const needsFunding   = enriched.filter(e => e.stillNeed > 0);
  const alreadyCovered = enriched.filter(e => e.isFullyCovered);

  // sort by urgency — overdue first, then by daily rate descending
  // (highest daily rate = most urgent relative to its due date)
  const sorted = [...needsFunding].sort((a, b) => {
    if (a.daysLeft <= 0 && b.daysLeft > 0) return -1;
    if (b.daysLeft <= 0 && a.daysLeft > 0) return 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.dailyRate - a.dailyRate;
  });

  let pool = billsPool;
  const funded   = [];
  const partial  = [];
  const unfunded = [];

  for (const expense of sorted) {
    if (expense.stillNeed === 0) continue;

    // how much should this shift contribute toward this bill?
    // use daily rate as the target contribution
    // but never more than what's still needed
    const targetContribution = Math.min(
      parseFloat(expense.dailyRate.toFixed(2)),
      expense.stillNeed
    );

    if (pool >= expense.stillNeed) {
      // can fully fund this bill this shift
      funded.push({
        ...expense,
        status:       'funded',
        amountFunded: expense.stillNeed,
      });
      pool = parseFloat((pool - expense.stillNeed).toFixed(2));
    } else if (pool >= targetContribution && pool > 0) {
      // can meet today's daily contribution
      funded.push({
        ...expense,
        status:       'funded',
        amountFunded: parseFloat(targetContribution.toFixed(2)),
      });
      pool = parseFloat((pool - targetContribution).toFixed(2));
    } else if (pool > 0) {
      // can only partially fund today's contribution
      partial.push({
        ...expense,
        status:       'partial',
        amountFunded: parseFloat(pool.toFixed(2)),
        amountNeeded: parseFloat((expense.stillNeed - pool).toFixed(2)),
        pctFunded:    parseFloat(((pool / expense.stillNeed) * 100).toFixed(1)),
      });
      pool = 0;
    } else {
      unfunded.push({ ...expense, status: 'unfunded', amountFunded: 0 });
    }
  }

  // if pool has surplus after daily contributions, accelerate most urgent bill
  if (pool > 0 && sorted.length > 0) {
    const mostUrgent = sorted.find(e =>
      !funded.find(f => f.id === e.id) &&
      !partial.find(p => p.id === e.id)
    );
    if (mostUrgent && pool > 0) {
      const canAdd = Math.min(pool, mostUrgent.stillNeed);
      funded.push({
        ...mostUrgent,
        status:       'funded',
        amountFunded: parseFloat(canAdd.toFixed(2)),
      });
      pool = parseFloat((pool - canAdd).toFixed(2));
    }
  }

  const discretionary     = parseFloat(pool.toFixed(2));
  const totalBillsCovered = parseFloat(
    funded.reduce((s, e) => s + e.amountFunded, 0).toFixed(2)
  );

  const explanation = buildExplanation({
    incomeAmount, personal, savings, emergency,
    billsPool, funded, partial, unfunded,
    discretionary, alreadyCovered,
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
    alreadyCovered,
    discretionary,
    totalBillsCovered,
    explanation,
  };
}

function buildExplanation({ incomeAmount, personal, savings, emergency,
  billsPool, funded, partial, unfunded, discretionary, alreadyCovered }) {

  const lines = [];
  lines.push(`Here's what we did with your $${incomeAmount.toFixed(2)}:`);
  lines.push(`→ $${personal.toFixed(2)} is yours — spend it, you earned it.`);
  lines.push(`→ $${savings.toFixed(2)} went to savings.`);
  lines.push(`→ $${emergency.toFixed(2)} went to your emergency fund.`);
  lines.push(`→ $${billsPool.toFixed(2)} went toward your bills:`);

  if (alreadyCovered && alreadyCovered.length > 0) {
    lines.push(`   ✓ Already covered this month: ${alreadyCovered.map(e => e.name).join(', ')}.`);
  }

  if (funded.length > 0) {
    const dueSoon = funded.filter(e => e.daysLeft <= 7);
    if (dueSoon.length > 0) {
      lines.push(`   ✓ Fully covered: ${dueSoon.map(e => e.name).join(', ')} — due within 7 days.`);
    }
    const later = funded.filter(e => e.daysLeft > 7);
    if (later.length > 0) {
      lines.push(`   ✓ Also covered: ${later.map(e => e.name).join(', ')}.`);
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

export function getMonthlySummary(historyEntries) {
  if (!historyEntries || !historyEntries.length) return null;

  const now = new Date();
  const thisMonth = historyEntries.filter(h => {
    const d = new Date(h.shift_date || h.created_at);
    return d.getMonth()    === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  });

  if (!thisMonth.length) return null;

  const totalIncome    = thisMonth.reduce((s, h) => s + h.amount, 0);
  const totalSavings   = thisMonth.reduce((s, h) => s + h.savings, 0);
  const totalEmergency = thisMonth.reduce((s, h) => s + h.emergency, 0);
  const totalPersonal  = thisMonth.reduce((s, h) => s + (h.personal || h.amount * 0.20), 0);
  const totalBillsPool = thisMonth.reduce((s, h) => s + (h.bills_pool || 0), 0);
  const shiftCount     = thisMonth.length;
  const avgShift       = totalIncome / shiftCount;
  const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth     = now.getDate();
  const projectedIncome = (totalIncome / dayOfMonth) * daysInMonth;
  const projectedBills  = projectedIncome * 0.60;

  return {
    totalIncome:     parseFloat(totalIncome.toFixed(2)),
    totalSavings:    parseFloat(totalSavings.toFixed(2)),
    totalEmergency:  parseFloat(totalEmergency.toFixed(2)),
    totalPersonal:   parseFloat(totalPersonal.toFixed(2)),
    totalBillsPool:  parseFloat(totalBillsPool.toFixed(2)),
    shiftCount,
    avgShift:        parseFloat(avgShift.toFixed(2)),
    projectedIncome: parseFloat(projectedIncome.toFixed(2)),
    projectedBills:  parseFloat(projectedBills.toFixed(2)),
    willCoverBills:  projectedBills >= TOTAL_FIXED,
  };
}

export function getInsights(historyEntries) {
  if (!historyEntries || !historyEntries.length) return null;

  const amounts    = historyEntries.map(h => h.amount);
  const bestShift  = Math.max(...amounts);
  const worstShift = Math.min(...amounts);
  const avgShift   = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const totalEarned = amounts.reduce((s, a) => s + a, 0);

  const byWeek = {};
  historyEntries.forEach(h => {
    const d    = new Date(h.shift_date || h.created_at);
    const week = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
    byWeek[week] = (byWeek[week] || 0) + h.amount;
  });
  const bestWeek = Math.max(...Object.values(byWeek));

  const byDow = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  historyEntries.forEach(h => {
    const dow = new Date(h.shift_date || h.created_at).getDay();
    byDow[dow].push(h.amount);
  });
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowAvgs  = dowNames.map((name, i) => ({
    name,
    avg: byDow[i].length
      ? parseFloat((byDow[i].reduce((s,a) => s+a,0) / byDow[i].length).toFixed(2))
      : 0,
    shifts: byDow[i].length,
  }));
  const bestDay = dowAvgs.reduce((best, d) => d.avg > best.avg ? d : best, dowAvgs[0]);

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