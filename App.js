// App.js
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput,
  TouchableOpacity, Alert, StatusBar, Modal,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  initDatabase, saveIncomeAndAllocation, getHistory,
  getBuckets, addToBucket, createBucket,
  getMonthlyBillProgress, updateBucket, deleteBucket,
  addManualBillContribution, addDebtPayment, getDebtPaymentTotals,
  getRecentBillContributions, deleteBillContribution,
  getRecentBucketContributions, deleteBucketContribution,
  getRecentDebtPayments, deleteDebtPayment,
  getUserBills, addUserBill, updateUserBill, deleteUserBill,
  getUserDebts, addUserDebt, updateUserDebt, deleteUserDebt,
  deleteShiftAllocation, editShiftAllocation,
  editBillContribution, editBucketContribution, editDebtPayment,
  editBucketBalance, editDebtBalance, editBillFundedAmount
} from './src/db/database';
import {
  allocate, getMonthlySummary, getInsights, getDebtSummary
} from './src/algorithm/algorithm';
import { EXPENSES, TOTAL_FIXED } from './src/constants/expenses';
import { colors } from './src/constants/theme';


initDatabase();

const TABS = ['Home', 'Budget', 'Insights', 'Buckets'];

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function App() {
  const [tab, setTab]               = useState('Home');
  const [income, setIncome]         = useState('');
  const [note, setNote]             = useState('');
  const [incomeType, setIncomeType] = useState('tips');
  const [shiftDate, setShiftDate]   = useState(formatDateKey(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [result, setResult]         = useState(null);
  const [history, setHistory]       = useState([]);
  const [buckets, setBuckets]       = useState([]);
  const [billProgress, setBillProgress] = useState([]);
  const [monthly, setMonthly]       = useState(null);
  const [insights, setInsights]     = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [bucketModal, setBucketModal]       = useState(false);
  const [newBucketName, setNewBucketName]         = useState('');
  const [newBucketGoal, setNewBucketGoal]         = useState('');
  const [newBucketTargetDate, setNewBucketTargetDate] = useState('');
  const [editBucketTargetDate, setEditBucketTargetDate] = useState('');
  const [addingToBucket, setAddingToBucket] = useState(null);
  const [bucketAmount, setBucketAmount]     = useState('');
  const [bucketSplits, setBucketSplits]     = useState({});
  const [remainingDiscretionary, setRemainingDiscretionary] = useState(0);
  const [editingBucket, setEditingBucket]   = useState(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [editBucketGoal, setEditBucketGoal] = useState('');
  const [billContribModal, setBillContribModal] = useState(null);
  const [billContribAmount, setBillContribAmount] = useState('');
  const [debtContribModal, setDebtContribModal] = useState(null);
  const [debtContribAmount, setDebtContribAmount] = useState('');
  const [debtPayments, setDebtPayments] = useState({});
  const [billContribHistory, setBillContribHistory] = useState([]);
  const [debtContribHistory, setDebtContribHistory] = useState([]);
  const [bucketHistory, setBucketHistory] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [addBillModal, setAddBillModal]   = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);
  const [newBillName, setNewBillName]     = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillDueDay, setNewBillDueDay] = useState('1');
  const [newBillCategory, setNewBillCategory] = useState('Other');
  const [newBillPriority, setNewBillPriority] = useState(3);
  const [addDebtModal, setAddDebtModal]       = useState(false);
  const [editingDebtId, setEditingDebtId]     = useState(null);
  const [newDebtName, setNewDebtName]         = useState('');
  const [newDebtBalance, setNewDebtBalance]   = useState('');
  const [newDebtApr, setNewDebtApr]           = useState('0');
  const [newDebtType, setNewDebtType]         = useState('credit');
  const [newDebtPromoExpiry, setNewDebtPromoExpiry] = useState('');
  const [newDebtMonthlyMin, setNewDebtMonthlyMin]   = useState('0');
  const [editShiftModal, setEditShiftModal]   = useState(null);
  const [editShiftAmount, setEditShiftAmount] = useState('');
  const [editingBillContribId, setEditingBillContribId]   = useState(null);
  const [editingBillContribAmt, setEditingBillContribAmt] = useState('');
  const [editingBucketContribId, setEditingBucketContribId]   = useState(null);
  const [editingBucketContribAmt, setEditingBucketContribAmt] = useState('');
  const [editingDebtPaymentId, setEditingDebtPaymentId]   = useState(null);
  const [editingDebtPaymentAmt, setEditingDebtPaymentAmt] = useState('');
  const [editBalanceModal, setEditBalanceModal]   = useState(null);
  const [editBalanceAmount, setEditBalanceAmount] = useState('');
  const [editDebtModal, setEditDebtModal]         = useState(null);
  const [editDebtAmount, setEditDebtAmount]       = useState('');
  const [editBillBalanceModal, setEditBillBalanceModal] = useState(null);
  const [editBillBalanceAmount, setEditBillBalanceAmount] = useState('');

  const refresh = useCallback(() => {
    const h = getHistory();
    setDebtPayments(getDebtPaymentTotals());
    const bp = getMonthlyBillProgress();
    const totalFunded = bp.reduce((s, b) => s + b.funded_total, 0);
    const billsCoverage = Math.min((totalFunded / TOTAL_FIXED) * 100, 100);
    const billsRemaining = Math.max(TOTAL_FIXED - totalFunded, 0);
    const summary = getMonthlySummary(h);
    setHistory(h);
    setBuckets(getBuckets());
    setBillProgress(bp);
    setInsights(getInsights(h));
    setMonthly(summary ? {
      ...summary,
      totalBills:     parseFloat(totalFunded.toFixed(2)),
      billsCoverage:  parseFloat(billsCoverage.toFixed(1)),
      billsRemaining: parseFloat(billsRemaining.toFixed(2)),
    } : null);
  }, []);

  useEffect(() => { refresh(); }, []);

  function handleAllocate() {
    const amount = parseFloat(income);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount');
      return;
    }
    const currentProgress = getMonthlyBillProgress();
    const allocation = allocate(amount, incomeType, null, currentProgress, getUserBills());
    saveIncomeAndAllocation(amount, incomeType, note, shiftDate, allocation);
    setResult(allocation);
    setRemainingDiscretionary(allocation.discretionary);
    refresh();
    setShowResult(true);
  }

  function handleAddToBucket(bucketId) {
    const amount = parseFloat(bucketAmount);
    if (isNaN(amount) || amount <= 0) return;
    addToBucket(bucketId, amount, '');
    setBuckets(getBuckets());
    setBucketHistory(getRecentBucketContributions(bucketId));
    setBucketAmount('');
  }

  function handleCreateBucket() {
    if (!newBucketName.trim()) return;
    const goal = parseFloat(newBucketGoal) || null;
    const palette = ['#00d4a8','#7b61ff','#ff9f43','#ff4d6a','#4dabf7'];
    const color = palette[buckets.length % palette.length];
    const td = newBucketTargetDate.trim() || null;
    createBucket(newBucketName.trim(), goal, td, color);
    setBuckets(getBuckets());
    setBucketModal(false);
    setNewBucketName('');
    setNewBucketGoal('');
    setNewBucketTargetDate('');
  }

  function handleLongPressBucket(b) {
    Alert.alert(
      b.name,
      `Balance: $${b.current_balance.toFixed(2)}`,
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingBucket(b);
            setEditBucketName(b.name);
            setEditBucketGoal(b.goal_amount ? String(b.goal_amount) : '');
            setEditBucketTargetDate(b.target_date || '');
          }
        },
        {
          text: 'Edit Balance',
          onPress: () => { setEditBalanceModal(b); setEditBalanceAmount(String(b.current_balance)); }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete bucket?',
              `"${b.name}" and $${b.current_balance.toFixed(2)} will be lost.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteBucket(b.id);
                    setBuckets(getBuckets());
                  }
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }

  // ── RESULT SCREEN ─────────────────────────────────────
  if (showResult && result) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.screenLabel}>ALLOCATION RESULT</Text>
          <Text style={s.bigNumber}>${result.incomeAmount.toFixed(2)}</Text>
          <Text style={s.muted}>
            {incomeType === 'tips' ? '💵 cash tips' : '💳 paycheck'} · {formatDisplay(shiftDate)}
          </Text>

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: colors.teal }]}>${result.personal.toFixed(2)}</Text>
              <Text style={s.statLbl}>yours</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: colors.savings }]}>${result.savings.toFixed(2)}</Text>
              <Text style={s.statLbl}>savings</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: colors.emergency }]}>${result.emergency.toFixed(2)}</Text>
              <Text style={s.statLbl}>emergency</Text>
            </View>
          </View>

          <View style={s.explanationCard}>
            <Text style={s.explanationText}>{result.explanation}</Text>
          </View>

          {result.alreadyCovered && result.alreadyCovered.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.teal, marginTop: 8 }]}>
                ALREADY COVERED · {result.alreadyCovered.length} bills
              </Text>
              {result.alreadyCovered.map(e => (
                <View key={e.id} style={s.billRow}>
                  <View style={[s.billDot, { backgroundColor: colors.teal }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.billName, { color: colors.textMuted }]}>{e.name}</Text>
                    <Text style={s.billSub}>fully covered this month ✓</Text>
                  </View>
                  <Text style={[s.billAmt, { color: colors.textMuted }]}>${e.amount.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          {result.funded.length > 0 && (
            <>
              <Text style={s.sectionLabel}>
                FUNDED · {result.funded.length} bills · ${result.totalBillsCovered.toFixed(2)}
              </Text>
              {result.funded.map(e => (
                <View key={e.id} style={s.billRow}>
                  <View style={s.billDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.billName}>{e.name}</Text>
                    <Text style={s.billSub}>{e.dueLabel} · {e.daysLeft}d</Text>
                  </View>
                  <Text style={[s.billAmt, { color: colors.funded }]}>${e.amountFunded.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          {result.partial.length > 0 && console.log('PARTIAL BILLS:', result.partial.map(p => ({
            name: p.name, alreadyFunded: p.alreadyFunded, amountFunded: p.amountFunded,
            amount: p.amount, pctFunded: p.pctFunded
          })))}
          {result.partial.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.emergency, marginTop: 16 }]}>PARTIAL</Text>
              {result.partial.map(e => (
                <View key={e.id} style={s.billRow}>
                  <View style={[s.billDot, { backgroundColor: colors.emergency }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.billName}>{e.name}</Text>
                    <Text style={s.billSub}>
                      ${e.amountFunded.toFixed(2)} of ${e.amount.toFixed(2)} · needs ${e.amountNeeded.toFixed(2)} more
                    </Text>
                    <View style={s.miniBarTrack}>
                      <View style={[s.miniBarFill, {
                        width: `${e.pctFunded}%`,
                        backgroundColor: colors.emergency,
                      }]} />
                    </View>
                  </View>
                  <Text style={[s.billAmt, { color: colors.emergency }]}>{e.pctFunded}%</Text>
                </View>
              ))}
            </>
          )}

          {result.unfunded.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.unfunded, marginTop: 16 }]}>
                UNFUNDED · {result.unfunded.length} bills
              </Text>
              {result.unfunded.map(e => (
                <View key={e.id} style={s.billRow}>
                  <View style={[s.billDot, { backgroundColor: colors.unfunded }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.billName}>{e.name}</Text>
                    <Text style={s.billSub}>{e.dueLabel} · {e.daysLeft}d away</Text>
                  </View>
                  <Text style={[s.billAmt, { color: colors.unfunded }]}>${e.amount.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          {result.discretionary > 0 && buckets.length > 0 && (
            <View style={[s.explanationCard, { borderColor: colors.teal + '44', marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8 }}>
                <Text style={[s.explanationText, { color: colors.teal }]}>💡 Split your leftover</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.statVal, { color: colors.teal, fontSize: 20 }]}>
                    ${remainingDiscretionary.toFixed(2)}
                  </Text>
                  <Text style={s.muted}>remaining</Text>
                </View>
              </View>

              {remainingDiscretionary <= 0 && (
                <Text style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>
                  ✓ All leftover money allocated
                </Text>
              )}

              {remainingDiscretionary > 0 && buckets.map(b => (
                <View key={b.id} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[s.billName, { color: b.color }]}>{b.name}</Text>
                    <Text style={s.muted}>${b.current_balance.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[s.input, { flex: 1, marginBottom: 0, padding: 10,
                        fontSize: 14, borderColor: b.color + '66' }]}
                      placeholder={`max $${remainingDiscretionary.toFixed(2)}`}
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onChangeText={text => setBucketSplits(prev => ({
                        ...prev, [`bucket_${b.id}`]: text
                      }))}
                      value={bucketSplits?.[`bucket_${b.id}`] || ''}
                    />
                    <TouchableOpacity
                      style={[s.btn, { paddingHorizontal: 16, paddingVertical: 10,
                        marginBottom: 0, backgroundColor: b.color }]}
                      onPress={() => {
                        const amt = parseFloat(bucketSplits?.[`bucket_${b.id}`] || '0');
                        if (isNaN(amt) || amt <= 0) {
                          Alert.alert('Enter an amount first');
                          return;
                        }
                        if (amt > remainingDiscretionary) {
                          Alert.alert('Not enough', `Only $${remainingDiscretionary.toFixed(2)} left`);
                          return;
                        }
                        addToBucket(b.id, amt, 'from shift');
                        setBuckets(getBuckets());
                        setRemainingDiscretionary(prev => parseFloat((prev - amt).toFixed(2)));
                        setBucketSplits(prev => ({ ...prev, [`bucket_${b.id}`]: '' }));
                      }}
                    >
                      <Text style={[s.btnText, { color: colors.bg }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={s.stickyFooter}>
          <TouchableOpacity style={s.btn} onPress={() => {
            setShowResult(false);
            setIncome('');
            setNote('');
            setResult(null);
            setShiftDate(formatDateKey(new Date()));
            setBucketSplits({});
            setRemainingDiscretionary(0);
            setTab('Home');
          }}>
            <Text style={s.btnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />

      {/* ── HOME TAB ── */}
      {tab === 'Home' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.appName}>FunDue</Text>

          {monthly && (
            <View style={s.monthCard}>
              <Text style={s.monthLabel}>THIS MONTH</Text>
              <Text style={s.monthIncome}>${monthly.totalIncome.toFixed(2)}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${monthly.billsCoverage}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.muted}>{monthly.billsCoverage}% bills covered</Text>
                <Text style={s.muted}>{monthly.shiftCount} shifts</Text>
              </View>
              {monthly.willCoverBills
                ? <Text style={[s.projText, { color: colors.teal }]}>✓ On track to cover all bills</Text>
                : <Text style={[s.projText, { color: colors.unfunded }]}>
                    ⚠ Need ${(TOTAL_FIXED - monthly.projectedBills).toFixed(2)} more at current pace
                  </Text>
              }
            </View>
          )}

          {monthly && (() => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthShifts = history.filter(h => {
              const d = new Date(h.shift_date + 'T12:00:00');
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const avgShift = monthShifts.length > 0
              ? monthShifts.reduce((s, h) => s + h.amount, 0) / monthShifts.length
              : null;

            const today = new Date();
            const unpaidBills = billProgress
              .filter(b => b.pct_funded < 100)
              .map(b => {
                const thisMonth = new Date(today.getFullYear(), today.getMonth(), b.due_day);
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, b.due_day);
                const target = thisMonth >= today ? thisMonth : nextMonth;
                const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                return { ...b, daysLeft };
              })
              .sort((a, b) => a.daysLeft - b.daysLeft);
            const nextBill = unpaidBills[0] || null;

            const totalSavings = buckets.reduce((s, b) => s + b.current_balance, 0);

            return (
              <View style={s.monthCard}>
                <Text style={s.monthLabel}>QUICK STATS</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={s.muted}>Avg shift this month</Text>
                  <Text style={[s.statVal, { color: colors.textPrimary }]}>
                    {avgShift !== null ? `$${avgShift.toFixed(2)}` : '--'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={s.muted}>Next bill due</Text>
                  <Text style={[s.statVal, { color: colors.textPrimary }]}>
                    {nextBill ? `${nextBill.name} · $${nextBill.target.toFixed(2)} · ${nextBill.daysLeft}d` : '--'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.muted}>Total savings</Text>
                  <Text style={[s.statVal, { color: colors.teal }]}>${totalSavings.toFixed(2)}</Text>
                </View>
              </View>
            );
          })()}

          {insights && (
            <>
              <Text style={s.sectionLabel}>AVERAGE BY DAY OF WEEK</Text>
              {insights.dowAvgs.map(d => (
                <View key={d.name} style={s.dowRow}>
                  <Text style={[s.dowName, d.name === insights.bestDay.name && { color: colors.teal }]}>
                    {d.name}{d.name === insights.bestDay.name ? ' 🔥' : ''}
                  </Text>
                  <View style={s.dowBarTrack}>
                    <View style={[s.dowBarFill, {
                      width: insights.bestShift > 0
                        ? `${(d.avg / insights.bestShift) * 100}%` : '0%',
                      backgroundColor: d.name === insights.bestDay.name
                        ? colors.teal : colors.elevated,
                    }]} />
                  </View>
                  <Text style={s.dowAmt}>{d.shifts > 0 ? `$${d.avg}` : '—'}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={s.sectionLabel}>INCOME TYPE</Text>
          <View style={s.segmented}>
            {['tips', 'paycheck'].map(type => (
              <TouchableOpacity
                key={type}
                style={[s.segment, incomeType === type && s.segmentActive]}
                onPress={() => setIncomeType(type)}
              >
                <Text style={[s.segmentText, incomeType === type && s.segmentTextActive]}>
                  {type === 'tips' ? '💵 Cash Tips' : '💳 Paycheck'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>SHIFT DATE</Text>
          <TouchableOpacity style={s.datePicker} onPress={() => {
            const d = new Date(shiftDate + 'T12:00:00');
            setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            setShowDatePicker(true);
          }}>
            <Text style={s.datePickerText}>
               {formatDisplay(shiftDate)}
            </Text>
            <Text style={s.muted}>tap to change</Text>
          </TouchableOpacity>

          <TextInput
            style={s.input}
            placeholder="Amount (e.g. 187.50)"
            placeholderTextColor={colors.textDisabled}
            keyboardType="decimal-pad"
            value={income}
            onChangeText={setIncome}
          />
          <TextInput
            style={s.input}
            placeholder="Note — e.g. Friday night"
            placeholderTextColor={colors.textDisabled}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity style={s.btn} onPress={handleAllocate}>
            <Text style={s.btnText}>Allocate Income</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── BUDGET TAB ── */}
      {tab === 'Budget' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.appName}>Budget</Text>
            <TouchableOpacity
              style={[s.addBillBtn]}
              onPress={() => {
                setEditingBillId(null);
                setNewBillName(''); setNewBillAmount(''); setNewBillDueDay('1');
                setNewBillCategory('Other'); setNewBillPriority(3);
                setAddBillModal(true);
              }}
            >
              <Text style={s.addBillBtnText}>+ Add Bill</Text>
            </TouchableOpacity>
          </View>

          {monthly && (
            <View style={s.monthCard}>
              <Text style={s.monthLabel}>MONTHLY BILLS COVERAGE</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${monthly.billsCoverage}%` }]} />
              </View>
              <Text style={[s.monthIncome, { fontSize: 28, marginTop: 8 }]}>
                {monthly.billsCoverage}%
              </Text>
              <Text style={s.muted}>
                ${monthly.totalBills.toFixed(2)} of ${TOTAL_FIXED.toFixed(2)} covered · ${monthly.billsRemaining.toFixed(2)} remaining
              </Text>
            </View>
          )}

          {['1','2','3','4'].map(p => {
            const pLabel = p === '1' ? 'CRITICAL' : p === '2' ? 'HIGH' : p === '3' ? 'NORMAL' : 'LOW';
            const pColor = p === '1' ? colors.unfunded : p === '2' ? colors.emergency
              : p === '3' ? colors.savings : colors.textMuted;
            const bills = billProgress.filter(b => String(b.priority) === p);
            if (!bills.length) return null;
            return (
              <View key={p}>
                <Text style={[s.sectionLabel, { color: pColor, marginTop: 16 }]}>{pLabel}</Text>
                {bills.map(b => {
                  const pct = Math.min(b.pct_funded, 100);
                  const isFullyFunded = pct >= 99.9;
                  const today = new Date();
                  const thisMonth = new Date(today.getFullYear(), today.getMonth(), b.due_day);
                  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, b.due_day);
                  const target = thisMonth >= today ? thisMonth : nextMonth;
                  const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
return (
                    <TouchableOpacity
                      key={b.id}
                      style={s.budgetBillCard}
                      onLongPress={() => {
                        Alert.alert(b.name, `$${b.funded_total.toFixed(2)} / $${b.target.toFixed(2)}`, [
                          { text: 'Contribute', onPress: () => { setBillContribModal(b); setBillContribHistory(getRecentBillContributions(b.id)); } },
                          { text: 'Edit Balance', onPress: () => { setEditBillBalanceModal(b); setEditBillBalanceAmount(b.funded_total.toFixed(2)); } },
                          { text: 'Edit', onPress: () => {
                            setEditingBillId(b.id);
                            setNewBillName(b.name);
                            setNewBillAmount(String(b.target));
                            setNewBillDueDay(String(b.due_day));
                            setNewBillCategory(b.category || 'Other');
                            setNewBillPriority(b.priority || 3);
                            setAddBillModal(true);
                          }},
                          { text: 'Delete', style: 'destructive', onPress: () => {
                            Alert.alert('Delete Bill', `Remove "${b.name}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => { deleteUserBill(b.id); refresh(); } },
                            ]);
                          }},
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                      delayLongPress={400}
                      activeOpacity={0.9}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[s.billName, isFullyFunded && { color: colors.teal }]}>
                          {isFullyFunded ? '✓ ' : ''}{b.name}
                        </Text>
                        <Text style={[s.billAmt, { color: isFullyFunded ? colors.teal : colors.textPrimary }]}>
                          ${b.funded_total.toFixed(2)} / ${b.target.toFixed(2)}
                        </Text>
                      </View>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, {
                          width: `${pct}%`,
                          backgroundColor: isFullyFunded ? colors.teal
                            : pct > 50 ? colors.savings
                            : pct > 0 ? colors.emergency
                            : colors.border,
                        }]} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={s.billSub}>{pct.toFixed(0)}% funded · due in {daysLeft}d</Text>
                        <Text style={s.billSub}>${(b.target - b.funded_total).toFixed(2)} left</Text>
                      </View>
                      {!isFullyFunded && (
                        <Text style={[s.billSub, { color: colors.textDisabled, marginTop: 4 }]}>
                          hold for options
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── INSIGHTS TAB ── */}
      {tab === 'Insights' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.appName}>Insights</Text>
            <TouchableOpacity
              style={s.addBillBtn}
              onPress={() => {
                setEditingDebtId(null);
                setNewDebtName(''); setNewDebtBalance(''); setNewDebtApr('0');
                setNewDebtType('credit'); setNewDebtPromoExpiry(''); setNewDebtMonthlyMin('0');
                setAddDebtModal(true);
              }}
            >
              <Text style={s.addBillBtnText}>+ Add Debt</Text>
            </TouchableOpacity>
          </View>

          {!insights && <Text style={s.empty}>Log a few shifts to see insights</Text>}

          {insights && (
            <>
              <View style={s.statRow}>
                <View style={s.statCard}>
                  <Text style={[s.statVal, { color: colors.teal }]}>${insights.bestShift.toFixed(2)}</Text>
                  <Text style={s.statLbl}>best shift</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statVal, { color: colors.savings }]}>${insights.avgShift.toFixed(2)}</Text>
                  <Text style={s.statLbl}>avg shift</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statVal, { color: colors.emergency }]}>${insights.worstShift.toFixed(2)}</Text>
                  <Text style={s.statLbl}>worst shift</Text>
                </View>
              </View>

              <View style={s.monthCard}>
                <Text style={s.monthLabel}>BEST WEEK EVER</Text>
                <Text style={s.monthIncome}>${insights.bestWeek.toFixed(2)}</Text>
              </View>

              <View style={s.monthCard}>
                <Text style={s.monthLabel}>TOTAL EARNED ALL TIME</Text>
                <Text style={s.monthIncome}>${insights.totalEarned.toFixed(2)}</Text>
                <Text style={s.muted}>{insights.totalShifts} shifts logged</Text>
              </View>

              {/* ── DEBT TRACKER ── */}
              {(() => {
                const debt = getDebtSummary(debtPayments);
                return (
                  <View style={{ marginTop: 8 }}>
                    <Text style={s.sectionLabel}>DEBT TRACKER</Text>
                    <Text style={[s.muted, { marginBottom: 12 }]}>
                      Total debt: ${debt.totalDebt.toLocaleString()}
                    </Text>

                    {debt.debts.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.monthCard, {
                          borderLeftWidth: 3,
                          borderLeftColor:
                            d.urgency === 'high' ? colors.unfunded :
                            d.urgency === 'medium' ? colors.emergency :
                            colors.textMuted,
                          marginBottom: 10,
                        }]}
                        onLongPress={() => {
                          Alert.alert(d.name, `Balance: $${d.balance.toLocaleString()}`, [
                            { text: 'Log Payment', onPress: () => { setDebtContribModal(d); setDebtContribHistory(getRecentDebtPayments(d.name)); } },
                            { text: 'Edit', onPress: () => {
                              setEditingDebtId(d.id || null);
                              setNewDebtName(d.name);
                              setNewDebtBalance(String(d.balance));
                              setNewDebtApr(String(d.apr));
                              setNewDebtType(d.type);
                              setNewDebtPromoExpiry(d.promo_expiry || '');
                              setNewDebtMonthlyMin(String(d.monthly_min || d.monthlyMin || 0));
                              setAddDebtModal(true);
                            }},
                            { text: 'Edit Balance', onPress: () => { setEditDebtModal(d); setEditDebtAmount(String(d.balance)); } },
                            { text: 'Delete', style: 'destructive', onPress: () => {
                              Alert.alert('Delete Debt', `Remove "${d.name}"?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => {
                                  if (d.id) { deleteUserDebt(d.id); refresh(); }
                                }},
                              ]);
                            }},
                            { text: 'Cancel', style: 'cancel' },
                          ]);
                        }}
                        delayLongPress={400}
                        activeOpacity={0.9}
                      >
                        <View style={{ flexDirection: 'row',
                          justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={s.billName}>{d.name}</Text>
                          <Text style={[s.billAmt, {
                            color: d.urgency === 'high' ? colors.unfunded :
                                   d.urgency === 'medium' ? colors.emergency :
                                   colors.textMuted
                          }]}>
                            ${d.balance.toLocaleString()}
                          </Text>
                        </View>

                        {d.type === 'promo' && (
                          <>
                            <View style={s.barTrack}>
                              <View style={[s.barFill, {
                                width: `${Math.min(
                                  ((d.name === 'CITI Card' ? 9 : 10) - d.monthsLeft) /
                                  (d.name === 'CITI Card' ? 9 : 10) * 100, 100
                                )}%`,
                                backgroundColor: colors.savings,
                              }]} />
                            </View>
                            <Text style={s.billSub}>
                              {d.monthsLeft} months left · 0% expires{' '}
                              {d.promoExpiry.toLocaleDateString('en-US',
                                { month: 'short', year: 'numeric' })}
                            </Text>
                            <Text style={[s.billSub, { color: colors.unfunded, marginTop: 2 }]}>
                              Need ${Math.ceil(d.balance / Math.max(d.monthsLeft, 1)).toLocaleString()}/mo to pay off in time
                            </Text>
                          </>
                        )}

                        {d.type === 'student' && (
                          <>
                            <Text style={[s.billSub, { color: colors.emergency }]}>
                              {d.apr}% APR · Deferred
                            </Text>
                            <Text style={s.billSub}>
                              Payments start in {d.daysToRepayment} days (Nov 2026)
                            </Text>
                          </>
                        )}

                        {d.type === 'installment' && (
                          <>
                            <View style={s.barTrack}>
                              <View style={[s.barFill, {
                                width: `${Math.min(
                                  ((41951.58 - d.balance) / 41951.58) * 100, 100
                                )}%`,
                                backgroundColor: colors.textMuted,
                              }]} />
                            </View>
                            <Text style={s.billSub}>
                              {d.apr}% APR · ${d.balance.toLocaleString()} remaining · ~{d.monthsLeft} months left
                            </Text>
                            {(() => {
                              const carBill = billProgress.find(b => b.name === 'Car Payment');
                              const monthlyFunded = carBill ? carBill.funded_total : 0;
                              const monthlyPct = Math.min((monthlyFunded / 676.83) * 100, 100);
                              return (
                                <>
                                  <Text style={[s.billSub, { marginTop: 8, fontWeight: '600',
                                    color: colors.textPrimary }]}>This month's payment</Text>
                                  <View style={s.barTrack}>
                                    <View style={[s.barFill, {
                                      width: `${monthlyPct}%`,
                                      backgroundColor: monthlyPct >= 100 ? colors.teal : colors.savings,
                                    }]} />
                                  </View>
                                  <Text style={s.billSub}>
                                    ${monthlyFunded.toFixed(2)} / $676.83 · {monthlyPct.toFixed(0)}%
                                    {monthlyPct >= 100 ? ' ✓ paid' : ''}
                                  </Text>
                                </>
                              );
                            })()}
                          </>
                        )}

                        <Text style={[s.billSub, { marginTop: 4, fontStyle: 'italic' }]}>
                          {d.note}
                        </Text>
                        <Text style={[s.billSub, { color: colors.textDisabled, marginTop: 6 }]}>
                          hold to record a payment
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {debt.studentDeferDaysLeft < 180 && (
                      <View style={[s.explanationCard, {
                        borderColor: colors.emergency + '44', marginTop: 4 }]}>
                        <Text style={[s.explanationText, { color: colors.emergency }]}>
                          ⚠ Student loans come out of deferment in{' '}
                          {debt.studentDeferDaysLeft} days. Start budgeting for payments now.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              <Text style={[s.sectionLabel, { marginTop: 16 }]}>RECENT SHIFTS</Text>
              {history.slice(0, 10).map(h => (
                <TouchableOpacity
                  key={h.id}
                  style={s.historyCard}
                  onLongPress={() => {
                    Alert.alert(
                      `$${h.amount.toFixed(2)} · ${formatDisplay(h.shift_date)}`,
                      h.note || h.income_type,
                      [
                        { text: 'Edit Amount', onPress: () => { setEditShiftModal(h); setEditShiftAmount(String(h.amount)); } },
                        { text: 'Delete Shift', style: 'destructive', onPress: () => {
                          Alert.alert(
                            'Delete this shift?',
                            `$${h.amount.toFixed(2)} · ${formatDisplay(h.shift_date)}`,
                            [
                              { text: 'Delete', style: 'destructive', onPress: () => { deleteShiftAllocation(h.id); refresh(); } },
                              { text: 'Cancel', style: 'cancel' },
                            ]
                          );
                        }},
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                  delayLongPress={400}
                  activeOpacity={0.9}
                >
                  <View style={s.historyTop}>
                    <Text style={s.historyAmt}>${h.amount.toFixed(2)}</Text>
                    <Text style={s.muted}>{formatDisplay(h.shift_date)}</Text>
                  </View>
                  <Text style={s.muted}>{h.note || h.income_type}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <Text style={[s.billSub, { color: colors.teal }]}>${(h.personal||0).toFixed(2)} personal</Text>
                    <Text style={[s.billSub, { color: colors.savings }]}>${h.savings.toFixed(2)} saved</Text>
                    <Text style={[s.billSub, { color: colors.emergency }]}>${h.emergency.toFixed(2)} emergency</Text>
                  </View>
                  <Text style={[s.billSub, { color: colors.textDisabled, marginTop: 4 }]}>hold to edit or delete</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── BUCKETS TAB ── */}
      {tab === 'Buckets' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 4 }}>
            <Text style={s.appName}>Buckets</Text>
            <TouchableOpacity
              style={[s.btn, { paddingVertical: 8, paddingHorizontal: 16, marginBottom: 0 }]}
              onPress={() => setBucketModal(true)}
            >
              <Text style={s.btnText}>+ New</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.muted, { marginBottom: 16 }]}>
            Save toward goals. Hold a bucket to edit or delete.
          </Text>

          {buckets.length === 0 && (
            <Text style={[s.empty, { marginTop: 40 }]}>No buckets yet</Text>
          )}

          {buckets.map(b => {
            const pct = b.goal_amount
              ? Math.min((b.current_balance / b.goal_amount) * 100, 100) : null;
            const monthlyNeeded = (() => {
              if (!b.goal_amount || !b.target_date) return null;
              const remaining = Math.max(b.goal_amount - b.current_balance, 0);
              if (remaining === 0) return null;
              const target = new Date(b.target_date);
              const now = new Date();
              const months = Math.max(
                (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()),
                1
              );
              return (remaining / months).toFixed(2);
            })();
            return (
              <TouchableOpacity
                key={b.id}
                style={[s.budgetBillCard, { borderLeftWidth: 3, borderLeftColor: b.color }]}
                onLongPress={() => handleLongPressBucket(b)}
                delayLongPress={400}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.billName}>{b.name}</Text>
                  <Text style={[s.billAmt, { color: b.color }]}>${b.current_balance.toFixed(2)}</Text>
                </View>
                {b.goal_amount && pct !== null && (
                  <>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: b.color }]} />
                    </View>
                    <Text style={s.billSub}>{pct.toFixed(1)}% of ${b.goal_amount.toFixed(2)} goal</Text>
                    {monthlyNeeded && (
                      <Text style={[s.billSub, { color: colors.teal }]}>
                        ${monthlyNeeded}/mo needed · target {new Date(b.target_date).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                      </Text>
                    )}
                  </>
                )}
                <Text style={[s.billSub, { color: colors.textDisabled, marginTop: 4 }]}>
                  hold to edit or delete
                </Text>
                {addingToBucket === b.id ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TextInput
                        style={[s.input, { flex: 1, marginBottom: 0, padding: 10 }]}
                        placeholder="Amount"
                        placeholderTextColor={colors.textDisabled}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        value={bucketAmount}
                        onChangeText={setBucketAmount}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[s.btn, { paddingHorizontal: 16, paddingVertical: 10, marginBottom: 0 }]}
                        onPress={() => handleAddToBucket(b.id)}
                      >
                        <Text style={s.btnText}>Add</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.btn, { paddingHorizontal: 12, paddingVertical: 10,
                          marginBottom: 0, backgroundColor: colors.elevated }]}
                        onPress={() => { setAddingToBucket(null); setBucketHistory([]); }}
                      >
                        <Text style={[s.btnText, { color: colors.textPrimary }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {bucketHistory.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={[s.fieldLabel, { marginBottom: 4 }]}>RECENT</Text>
                        {bucketHistory.map(c => (
                          <View key={c.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                            {editingBucketContribId === c.id ? (
                              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TextInput
                                  style={[s.input, { flex: 1, marginBottom: 0, padding: 8 }]}
                                  keyboardType="decimal-pad"
                                  value={editingBucketContribAmt}
                                  onChangeText={setEditingBucketContribAmt}
                                  returnKeyType="done"
                                  autoFocus
                                />
                                <TouchableOpacity onPress={() => {
                                  const amt = parseFloat(editingBucketContribAmt);
                                  if (!isNaN(amt) && amt > 0) {
                                    editBucketContribution(c.id, b.id, amt);
                                    setBuckets(getBuckets());
                                    setBucketHistory(getRecentBucketContributions(b.id));
                                  }
                                  setEditingBucketContribId(null);
                                }}>
                                  <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingBucketContribId(null)}>
                                  <Text style={[s.btnText, { color: colors.textMuted, fontSize: 13 }]}>Cancel</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[s.billName, { color: colors.textPrimary }]}>${c.amount.toFixed(2)}</Text>
                                <Text style={s.billSub}>{c.created_at.slice(0, 10)}</Text>
                                <TouchableOpacity onPress={() => { setEditingBucketContribId(c.id); setEditingBucketContribAmt(String(c.amount)); }}>
                                  <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                  deleteBucketContribution(c.id, c.amount, b.id);
                                  setBuckets(getBuckets());
                                  setBucketHistory(getRecentBucketContributions(b.id));
                                }}>
                                  <Text style={[s.btnText, { color: colors.unfunded, fontSize: 13 }]}>Remove</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    style={[s.btn, { marginTop: 10, marginBottom: 0,
                      paddingVertical: 8, backgroundColor: colors.elevated }]}
                    onPress={() => {
                      setAddingToBucket(b.id);
                      setBucketHistory(getRecentBucketContributions(b.id));
                    }}
                  >
                    <Text style={[s.btnText, { color: colors.textPrimary }]}>+ Add Money</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {TABS.map(t => {
          const active = tab === t;
          const iconProps = { size: 24, color: active ? colors.teal : colors.textMuted };
          const icon =
            t === 'Home'     ? <Ionicons name={active ? 'home' : 'home-outline'} {...iconProps} /> :
            t === 'Budget'   ? <Ionicons name={active ? 'wallet' : 'wallet-outline'} {...iconProps} /> :
            t === 'Insights' ? <Ionicons name={active ? 'bar-chart' : 'bar-chart-outline'} {...iconProps} /> :
                               <Ionicons name={active ? 'save' : 'save-outline'} {...iconProps} />;
          return (
            <TouchableOpacity key={t} style={s.tabItem} onPress={() => setTab(t)}>
              {icon}
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── DATE PICKER MODAL ── */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>When was this shift?</Text>
            {(() => {
              const today = new Date();
              const todayKey = formatDateKey(today);
              const shiftKeys = new Set(history.map(h => h.shift_date));
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const minMonth = new Date(today.getFullYear(), today.getMonth() - 6, 1);
              const maxMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              const canGoBack = calendarMonth.getTime() > minMonth.getTime();
              const canGoForward = calendarMonth.getTime() < maxMonth.getTime();
              const firstDayOfWeek = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);
              const rows = [];
              for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
              return (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 16 }}>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => canGoBack && setCalendarMonth(new Date(year, month - 1, 1))}
                    >
                      <Text style={[s.calNavArrow, !canGoBack && { color: colors.textDisabled }]}>‹</Text>
                    </TouchableOpacity>
                    <Text style={s.calMonthLabel}>{monthLabel}</Text>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => canGoForward && setCalendarMonth(new Date(year, month + 1, 1))}
                    >
                      <Text style={[s.calNavArrow, !canGoForward && { color: colors.textDisabled }]}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.calWeekRow}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(lbl => (
                      <Text key={lbl} style={s.calDayHeader}>{lbl}</Text>
                    ))}
                  </View>
                  {rows.map((row, ri) => (
                    <View key={ri} style={s.calWeekRow}>
                      {row.map((day, ci) => {
                        if (!day) return <View key={ci} style={s.calDayCell} />;
                        const dateKey = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const isToday    = dateKey === todayKey;
                        const isSelected = dateKey === shiftDate;
                        const isFuture   = dateKey > todayKey;
                        const hasShift   = shiftKeys.has(dateKey);
                        return (
                          <TouchableOpacity
                            key={ci}
                            style={s.calDayCell}
                            onPress={() => { if (isFuture) return; setShiftDate(dateKey); setShowDatePicker(false); }}
                            activeOpacity={isFuture ? 1 : 0.7}
                          >
                            <View style={[
                              s.calDayCircle,
                              isToday && !isSelected && { borderWidth: 1, borderColor: colors.teal },
                              isSelected && { backgroundColor: colors.teal },
                            ]}>
                              <Text style={[
                                s.calDayText,
                                isFuture && { color: colors.textDisabled },
                                isSelected && { color: colors.bg },
                              ]}>
                                {day}
                              </Text>
                            </View>
                            {hasShift && !isFuture && <View style={s.calDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </>
              );
            })()}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.elevated, marginTop: 16 }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── NEW BUCKET MODAL ── */}
      <Modal visible={bucketModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>New Savings Bucket</Text>

              <Text style={s.fieldLabel}>Bucket name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Vacation, New Tires, CITI Payoff"
                placeholderTextColor={colors.textDisabled}
                value={newBucketName}
                onChangeText={setNewBucketName}
                returnKeyType="next"
                autoFocus
              />

              <Text style={s.fieldLabel}>Goal amount (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 2000"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newBucketGoal}
                onChangeText={setNewBucketGoal}
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>Target date (optional, YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 2026-12-01"
                placeholderTextColor={colors.textDisabled}
                value={newBucketTargetDate}
                onChangeText={setNewBucketTargetDate}
                returnKeyType="done"
                onSubmitEditing={handleCreateBucket}
              />

              <Text style={s.fieldLabel}>Quick suggestions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { label: '3mo expenses', amount: (TOTAL_FIXED * 3).toFixed(2) },
                    { label: '6mo expenses', amount: (TOTAL_FIXED * 6).toFixed(2) },
                    { label: 'CITI payoff',  amount: '2520.00' },
                    { label: 'Vacation',     amount: '2000.00' },
                    { label: 'New tires',    amount: '600.00' },
                  ].map(chip => (
                    <TouchableOpacity
                      key={chip.label}
                      style={[s.bucketChip, { borderColor: colors.teal }]}
                      onPress={() => {
                        setNewBucketGoal(chip.amount);
                        setNewBucketName(prev => prev || chip.label);
                      }}
                    >
                      <Text style={[s.bucketChipText, { color: colors.teal }]}>
                        {chip.label} ${parseFloat(chip.amount).toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={s.btn} onPress={handleCreateBucket}>
                <Text style={s.btnText}>Create Bucket</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setBucketModal(false); setNewBucketName(''); setNewBucketGoal(''); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DEBT CONTRIBUTION MODAL ── */}
      <Modal visible={!!debtContribModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{debtContribModal?.name}</Text>
              <Text style={[s.muted, { marginBottom: 16 }]}>
                Balance: ${debtContribModal?.balance.toLocaleString()}
              </Text>

              <Text style={s.fieldLabel}>Payment amount</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 100.00"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={debtContribAmount}
                onChangeText={setDebtContribAmount}
                returnKeyType="done"
                autoFocus
              />

              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const amt = parseFloat(debtContribAmount);
                  if (isNaN(amt) || amt <= 0) return;
                  addDebtPayment(debtContribModal.name, amt, formatDateKey(new Date()));
                  setDebtPayments(getDebtPaymentTotals());
                  setDebtContribModal(null);
                  setDebtContribAmount('');
                  setDebtContribHistory([]);
                }}
              >
                <Text style={s.btnText}>Record Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setDebtContribModal(null); setDebtContribAmount(''); setDebtContribHistory([]); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              {debtContribHistory.length > 0 && (
                <>
                  <Text style={[s.fieldLabel, { marginTop: 12 }]}>RECENT</Text>
                  {debtContribHistory.map(c => (
                    <View key={c.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                      {editingDebtPaymentId === c.id ? (
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            style={[s.input, { flex: 1, marginBottom: 0, padding: 8 }]}
                            keyboardType="decimal-pad"
                            value={editingDebtPaymentAmt}
                            onChangeText={setEditingDebtPaymentAmt}
                            returnKeyType="done"
                            autoFocus
                          />
                          <TouchableOpacity onPress={() => {
                            const amt = parseFloat(editingDebtPaymentAmt);
                            if (!isNaN(amt) && amt > 0) {
                              editDebtPayment(c.id, amt);
                              setDebtContribHistory(getRecentDebtPayments(debtContribModal.name));
                              setDebtPayments(getDebtPaymentTotals());
                            }
                            setEditingDebtPaymentId(null);
                          }}>
                            <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingDebtPaymentId(null)}>
                            <Text style={[s.btnText, { color: colors.textMuted, fontSize: 13 }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[s.billName, { color: colors.textPrimary }]}>${c.amount.toFixed(2)}</Text>
                          <Text style={s.billSub}>{c.date}</Text>
                          <TouchableOpacity onPress={() => { setEditingDebtPaymentId(c.id); setEditingDebtPaymentAmt(String(c.amount)); }}>
                            <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            deleteDebtPayment(c.id);
                            setDebtContribHistory(getRecentDebtPayments(debtContribModal.name));
                            setDebtPayments(getDebtPaymentTotals());
                          }}>
                            <Text style={[s.btnText, { color: colors.unfunded, fontSize: 13 }]}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── BILL CONTRIBUTION MODAL ── */}
      <Modal visible={!!billContribModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{billContribModal?.name}</Text>
              <Text style={[s.muted, { marginBottom: 16 }]}>
                ${billContribModal?.funded_total.toFixed(2)} of ${billContribModal?.target.toFixed(2)} funded
                {' · '}${(billContribModal
                  ? Math.max(billContribModal.target - billContribModal.funded_total, 0)
                  : 0).toFixed(2)} remaining
              </Text>

              <Text style={s.fieldLabel}>Amount to add</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 50.00"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={billContribAmount}
                onChangeText={setBillContribAmount}
                returnKeyType="done"
                autoFocus
              />

              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const amt = parseFloat(billContribAmount);
                  if (isNaN(amt) || amt <= 0) return;
                  addManualBillContribution(billContribModal.id, amt, formatDateKey(new Date()));
                  refresh();
                  setBillContribModal(null);
                  setBillContribAmount('');
                  setBillContribHistory([]);
                }}
              >
                <Text style={s.btnText}>Add Amount</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.teal }]}
                onPress={() => {
                  const remaining = parseFloat(
                    Math.max(billContribModal.target - billContribModal.funded_total, 0).toFixed(2)
                  );
                  if (remaining <= 0) return;
                  addManualBillContribution(billContribModal.id, remaining, formatDateKey(new Date()));
                  refresh();
                  setBillContribModal(null);
                  setBillContribAmount('');
                  setBillContribHistory([]);
                }}
              >
                <Text style={[s.btnText, { color: colors.teal }]}>Mark as Fully Paid</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setBillContribModal(null); setBillContribAmount(''); setBillContribHistory([]); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              {billContribHistory.length > 0 && (
                <>
                  <Text style={[s.fieldLabel, { marginTop: 12 }]}>RECENT</Text>
                  {billContribHistory.map(c => (
                    <View key={c.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                      {editingBillContribId === c.id ? (
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            style={[s.input, { flex: 1, marginBottom: 0, padding: 8 }]}
                            keyboardType="decimal-pad"
                            value={editingBillContribAmt}
                            onChangeText={setEditingBillContribAmt}
                            returnKeyType="done"
                            autoFocus
                          />
                          <TouchableOpacity onPress={() => {
                            const amt = parseFloat(editingBillContribAmt);
                            if (!isNaN(amt) && amt > 0) {
                              editBillContribution(c.id, amt);
                              setBillContribHistory(getRecentBillContributions(billContribModal.id));
                              refresh();
                            }
                            setEditingBillContribId(null);
                          }}>
                            <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingBillContribId(null)}>
                            <Text style={[s.btnText, { color: colors.textMuted, fontSize: 13 }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[s.billName, { color: colors.textPrimary }]}>${c.amount_funded.toFixed(2)}</Text>
                          <Text style={s.billSub}>{c.shift_date}</Text>
                          <TouchableOpacity onPress={() => { setEditingBillContribId(c.id); setEditingBillContribAmt(String(c.amount_funded)); }}>
                            <Text style={[s.btnText, { color: colors.teal, fontSize: 13 }]}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            deleteBillContribution(c.id);
                            setBillContribHistory(getRecentBillContributions(billContribModal.id));
                            refresh();
                          }}>
                            <Text style={[s.btnText, { color: colors.unfunded, fontSize: 13 }]}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT BUCKET MODAL ── */}
      <Modal visible={!!editingBucket} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Bucket</Text>

              <Text style={s.fieldLabel}>Name</Text>
              <TextInput
                style={s.input}
                value={editBucketName}
                onChangeText={setEditBucketName}
                placeholderTextColor={colors.textDisabled}
                returnKeyType="next"
                autoFocus
              />

              <Text style={s.fieldLabel}>Goal amount</Text>
              <TextInput
                style={s.input}
                value={editBucketGoal}
                onChangeText={setEditBucketGoal}
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>Target date (optional, YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 2026-12-01"
                placeholderTextColor={colors.textDisabled}
                value={editBucketTargetDate}
                onChangeText={setEditBucketTargetDate}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  if (!editBucketName.trim()) return;
                  const goal = parseFloat(editBucketGoal) || null;
                  const td = editBucketTargetDate.trim() || null;
                  updateBucket(editingBucket.id, editBucketName.trim(), goal, td);
                  setBuckets(getBuckets());
                  setEditingBucket(null);
                }}
              >
                <Text style={s.btnText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => setEditingBucket(null)}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD / EDIT DEBT MODAL ── */}
      <Modal visible={addDebtModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{editingDebtId ? 'Edit Debt' : 'New Debt'}</Text>

              <Text style={s.fieldLabel}>Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. CITI Card"
                placeholderTextColor={colors.textDisabled}
                value={newDebtName}
                onChangeText={setNewDebtName}
                returnKeyType="next"
                autoFocus
              />

              <Text style={s.fieldLabel}>Current balance ($)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 2500"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newDebtBalance}
                onChangeText={setNewDebtBalance}
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>APR (%)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 19.99  (0 for promo)"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newDebtApr}
                onChangeText={setNewDebtApr}
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>Monthly minimum ($)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 25"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newDebtMonthlyMin}
                onChangeText={setNewDebtMonthlyMin}
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>Type</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
                {[['Credit','credit'],['Promo 0%','promo'],['Student','student'],['Installment','installment']].map(([label, val]) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.priorityChip, newDebtType === val && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                    onPress={() => setNewDebtType(val)}
                  >
                    <Text style={[s.priorityChipText, newDebtType === val && { color: colors.bg }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newDebtType === 'promo' && (
                <>
                  <Text style={s.fieldLabel}>Promo expiry (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 2027-02-01"
                    placeholderTextColor={colors.textDisabled}
                    value={newDebtPromoExpiry}
                    onChangeText={setNewDebtPromoExpiry}
                    returnKeyType="done"
                  />
                </>
              )}

              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  if (!newDebtName.trim() || !newDebtBalance.trim()) return;
                  const bal = parseFloat(newDebtBalance);
                  const apr = parseFloat(newDebtApr) || 0;
                  const min = parseFloat(newDebtMonthlyMin) || 0;
                  if (isNaN(bal) || bal < 0) return;
                  if (editingDebtId) {
                    updateUserDebt(editingDebtId, newDebtName.trim(), bal, apr, newDebtType, newDebtPromoExpiry || null, min);
                  } else {
                    addUserDebt(newDebtName.trim(), bal, apr, newDebtType, newDebtPromoExpiry || null, min);
                  }
                  refresh();
                  setAddDebtModal(false);
                }}
              >
                <Text style={s.btnText}>{editingDebtId ? 'Save Changes' : 'Add Debt'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => setAddDebtModal(false)}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT BUCKET BALANCE MODAL ── */}
      <Modal visible={!!editBalanceModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Balance — {editBalanceModal?.name}</Text>
              <Text style={s.fieldLabel}>New balance ($)</Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                value={editBalanceAmount}
                onChangeText={setEditBalanceAmount}
                returnKeyType="done"
                autoFocus
              />
              <Text style={[s.muted, { marginBottom: 16 }]}>This directly sets the balance</Text>
              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const bal = parseFloat(editBalanceAmount);
                  if (isNaN(bal) || bal < 0) return;
                  editBucketBalance(editBalanceModal.id, bal);
                  setBuckets(getBuckets());
                  setEditBalanceModal(null);
                  setEditBalanceAmount('');
                }}
              >
                <Text style={s.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setEditBalanceModal(null); setEditBalanceAmount(''); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT DEBT BALANCE MODAL ── */}
      <Modal visible={!!editDebtModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Balance — {editDebtModal?.name}</Text>
              <Text style={s.fieldLabel}>New balance ($)</Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                value={editDebtAmount}
                onChangeText={setEditDebtAmount}
                returnKeyType="done"
                autoFocus
              />
              <Text style={[s.muted, { marginBottom: 16 }]}>This directly sets the remaining balance</Text>
              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const bal = parseFloat(editDebtAmount);
                  if (isNaN(bal) || bal < 0) return;
                  editDebtBalance(editDebtModal.id, bal);
                  refresh();
                  setEditDebtModal(null);
                  setEditDebtAmount('');
                }}
              >
                <Text style={s.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setEditDebtModal(null); setEditDebtAmount(''); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT BILL BALANCE MODAL ── */}
      <Modal visible={!!editBillBalanceModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Balance</Text>
              <Text style={[s.muted, { marginBottom: 16 }]}>{editBillBalanceModal?.name}</Text>
              <Text style={s.fieldLabel}>Funded amount this month ($)</Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                value={editBillBalanceAmount}
                onChangeText={setEditBillBalanceAmount}
                returnKeyType="done"
                autoFocus
              />
              <Text style={[s.muted, { marginBottom: 16 }]}>Sets total funded this month</Text>
              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const amt = parseFloat(editBillBalanceAmount);
                  if (isNaN(amt) || amt < 0) return;
                  editBillFundedAmount(editBillBalanceModal.id, amt);
                  refresh();
                  setEditBillBalanceModal(null);
                  setEditBillBalanceAmount('');
                }}
              >
                <Text style={s.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setEditBillBalanceModal(null); setEditBillBalanceAmount(''); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT SHIFT MODAL ── */}
      <Modal visible={!!editShiftModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Shift Amount</Text>
              <Text style={[s.muted, { marginBottom: 16 }]}>
                {editShiftModal ? formatDisplay(editShiftModal.shift_date) : ''}
              </Text>
              <Text style={s.fieldLabel}>New amount ($)</Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                value={editShiftAmount}
                onChangeText={setEditShiftAmount}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  const amt = parseFloat(editShiftAmount);
                  if (isNaN(amt) || amt <= 0) return;
                  editShiftAllocation(editShiftModal.id, amt);
                  refresh();
                  setEditShiftModal(null);
                  setEditShiftAmount('');
                }}
              >
                <Text style={s.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => { setEditShiftModal(null); setEditShiftAmount(''); }}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD / EDIT BILL MODAL ── */}
      <Modal visible={addBillModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>{editingBillId ? 'Edit Bill' : 'New Bill'}</Text>

              <Text style={s.fieldLabel}>Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Rent"
                placeholderTextColor={colors.textDisabled}
                value={newBillName}
                onChangeText={setNewBillName}
                returnKeyType="next"
                autoFocus
              />

              <Text style={s.fieldLabel}>Monthly amount ($)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 1200"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newBillAmount}
                onChangeText={setNewBillAmount}
                returnKeyType="next"
              />

              <Text style={s.fieldLabel}>Due day of month</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 1"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                value={newBillDueDay}
                onChangeText={setNewBillDueDay}
                returnKeyType="done"
              />

              <Text style={s.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['Housing','Transport','Utilities','Food','Health','Entertainment','Other'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.categoryChip, newBillCategory === cat && s.categoryChipActive]}
                    onPress={() => setNewBillCategory(cat)}
                  >
                    <Text style={[s.categoryChipText, newBillCategory === cat && { color: colors.bg }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.fieldLabel}>Priority</Text>
              <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                {[['Critical',1,colors.unfunded],['High',2,colors.emergency],['Normal',3,colors.savings],['Low',4,colors.textMuted]].map(([label, val, col]) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.priorityChip, newBillPriority === val && { backgroundColor: col, borderColor: col }]}
                    onPress={() => setNewBillPriority(val)}
                  >
                    <Text style={[s.priorityChipText, newBillPriority === val && { color: colors.bg }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={s.btn}
                onPress={() => {
                  if (!newBillName.trim() || !newBillAmount.trim()) return;
                  const amt = parseFloat(newBillAmount);
                  const day = parseInt(newBillDueDay, 10);
                  if (isNaN(amt) || amt <= 0 || isNaN(day) || day < 1 || day > 31) return;
                  if (editingBillId) {
                    updateUserBill(editingBillId, newBillName.trim(), amt, day, newBillCategory, newBillPriority);
                  } else {
                    addUserBill(newBillName.trim(), amt, day, newBillCategory, newBillPriority);
                  }
                  refresh();
                  setAddBillModal(false);
                }}
              >
                <Text style={s.btnText}>{editingBillId ? 'Save Changes' : 'Add Bill'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.elevated }]}
                onPress={() => setAddBillModal(false)}
              >
                <Text style={[s.btnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content:       { padding: 24, paddingTop: 64, paddingBottom: 24 },
  appName:       { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  screenLabel:   { fontSize: 11, color: colors.textMuted, fontWeight: '600',
                   letterSpacing: 1, marginBottom: 8 },
  bigNumber:     { fontSize: 52, fontWeight: '700', color: colors.textPrimary },
  muted:         { fontSize: 12, color: colors.textMuted },
  empty:         { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  monthCard:     { backgroundColor: colors.surface, borderRadius: 14, padding: 16,
                   marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  monthLabel:    { fontSize: 11, color: colors.textMuted, fontWeight: '600',
                   letterSpacing: 1, marginBottom: 8 },
  monthIncome:   { fontSize: 36, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  projText:      { fontSize: 12, fontWeight: '600', marginTop: 8 },
  statRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:      { flex: 1, backgroundColor: colors.surface, borderRadius: 12,
                   padding: 12, borderWidth: 1, borderColor: colors.border },
  statVal:       { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  statLbl:       { fontSize: 10, color: colors.textMuted },
  input:         { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                   borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary,
                   marginBottom: 10 },
  btn:           { backgroundColor: colors.teal, borderRadius: 12, padding: 15,
                   alignItems: 'center', marginBottom: 10 },
  btnText:       { color: colors.bg, fontSize: 15, fontWeight: '700' },
  segmented:     { flexDirection: 'row', backgroundColor: colors.surface,
                   borderRadius: 10, padding: 3, marginBottom: 12,
                   borderWidth: 1, borderColor: colors.border },
  segment:       { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: colors.teal },
  segmentText:   { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.bg },
  datePicker:    { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                   borderRadius: 12, padding: 14, marginBottom: 10,
                   flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datePickerText:{ fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  sectionLabel:  { fontSize: 11, fontWeight: '600', color: colors.textMuted,
                   letterSpacing: 1, marginBottom: 10 },
  billRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  billDot:       { width: 7, height: 7, borderRadius: 4,
                   backgroundColor: colors.teal, marginRight: 10, marginTop: 2 },
  billName:      { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  billSub:       { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  billAmt:       { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  barTrack:      { height: 6, backgroundColor: colors.border, borderRadius: 3,
                   overflow: 'hidden', marginVertical: 4 },
  barFill:       { height: '100%', backgroundColor: colors.teal, borderRadius: 3 },
  miniBarTrack:  { height: 3, backgroundColor: colors.border, borderRadius: 2,
                   overflow: 'hidden', marginTop: 4 },
  miniBarFill:   { height: '100%', borderRadius: 2 },
  budgetBillCard:{ backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                   marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  dowRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dowName:       { width: 42, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dowBarTrack:   { flex: 1, height: 6, backgroundColor: colors.border,
                   borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  dowBarFill:    { height: '100%', borderRadius: 3 },
  dowAmt:        { width: 44, fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  historyCard:   { backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                   marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  historyTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  historyAmt:    { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  explanationCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                     marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  explanationText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  bucketChip:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  bucketChipText:{ fontSize: 12, fontWeight: '600' },
  tabBar:        { flexDirection: 'row', backgroundColor: colors.elevated,
                   borderTopWidth: 1, borderTopColor: colors.border,
                   paddingBottom: 28, paddingTop: 10 },
  tabItem:       { flex: 1, alignItems: 'center' },
  tabLabel:       { fontSize: 10, color: colors.textDisabled, fontWeight: '600', marginTop: 3 },
  tabLabelActive: { color: colors.teal },
  modalOverlay:  { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: colors.elevated, borderTopLeftRadius: 20,
                   borderTopRightRadius: 20, padding: 24, paddingBottom: 48 },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  fieldLabel:    { fontSize: 11, color: colors.textMuted, fontWeight: '600',
                   letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  dateOption:    { padding: 14, borderRadius: 10, marginBottom: 6,
                   backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                   flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateOptionActive: { borderColor: colors.teal },
  dateOptionText:{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  stickyFooter:  { padding: 16, paddingBottom: 36, backgroundColor: colors.bg,
                   borderTopWidth: 1, borderTopColor: colors.border },
  calNavArrow:   { fontSize: 28, fontWeight: '300', color: colors.textPrimary, lineHeight: 34 },
  calMonthLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  calWeekRow:    { flexDirection: 'row', marginBottom: 2 },
  calDayHeader:  { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600',
                   color: colors.textMuted, paddingBottom: 8 },
  calDayCell:    { flex: 1, alignItems: 'center', paddingVertical: 3 },
  calDayCircle:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center',
                   justifyContent: 'center' },
  calDayText:    { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  calDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.teal, marginTop: 2 },
  addBillBtn:    { backgroundColor: colors.teal, paddingHorizontal: 14, paddingVertical: 8,
                   borderRadius: 20 },
  addBillBtnText: { color: colors.bg, fontWeight: '700', fontSize: 13 },
  categoryChip:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8,
                   borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  categoryChipText:   { color: colors.textPrimary, fontSize: 13 },
  priorityChip:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
                   borderWidth: 1, borderColor: colors.border },
  priorityChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});