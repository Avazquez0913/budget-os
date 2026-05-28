// App.js
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput,
  TouchableOpacity, Alert, StatusBar, Modal
} from 'react-native';
import {
  initDatabase, saveIncomeAndAllocation, getHistory,
  getBuckets, addToBucket, createBucket,
  getMonthlyBillProgress
} from './src/db/database';
import {
  allocate, getMonthlySummary, getInsights, getDebtCountdown
} from './src/algorithm/algorithm';
import { EXPENSES, TOTAL_FIXED } from './src/constants/expenses';
import { colors } from './src/constants/theme';

initDatabase();

const TABS = ['Home', 'Budget', 'Insights', 'Buckets'];

// ── DATE HELPERS ──────────────────────────────────────
function formatDateKey(date) {
  return date.toISOString().split('T')[0]; // "2026-05-25"
}

function formatDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildDateOptions() {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKey(d);
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : formatDisplay(key);
    options.push({ key, label });
  }
  return options;
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
  const [bucketModal, setBucketModal]   = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketGoal, setNewBucketGoal] = useState('');
  const [addingToBucket, setAddingToBucket] = useState(null);
  const [bucketAmount, setBucketAmount]     = useState('');

  const dateOptions = buildDateOptions();

  const refresh = useCallback(() => {
    const h = getHistory();
    const bp = getMonthlyBillProgress();
    const totalFunded = bp.reduce((s, b) => s + b.funded_total, 0);
    const TOTAL = TOTAL_FIXED;
    const billsCoverage = Math.min((totalFunded / TOTAL) * 100, 100);
    const billsRemaining = Math.max(TOTAL - totalFunded, 0);
    const summary = getMonthlySummary(h);

    setHistory(h);
    setBuckets(getBuckets());
    setBillProgress(bp);
    setInsights(getInsights(h));
    setMonthly(summary ? {
      ...summary,
      totalBills:    parseFloat(totalFunded.toFixed(2)),
      billsCoverage: parseFloat(billsCoverage.toFixed(1)),
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
    const allocation = allocate(amount, incomeType);
    saveIncomeAndAllocation(amount, incomeType, note, shiftDate, allocation);
    setResult(allocation);
    refresh();
    setShowResult(true);
  }

  function handleAddToBucket(bucketId) {
    const amount = parseFloat(bucketAmount);
    if (isNaN(amount) || amount <= 0) return;
    addToBucket(bucketId, amount, '');
    setBuckets(getBuckets());
    setAddingToBucket(null);
    setBucketAmount('');
  }

  function handleCreateBucket() {
    if (!newBucketName.trim()) return;
    const goal = parseFloat(newBucketGoal) || null;
    const palette = ['#00d4a8','#7b61ff','#ff9f43','#ff4d6a','#4dabf7'];
    const color = palette[buckets.length % palette.length];
    createBucket(newBucketName.trim(), goal, null, color);
    setBuckets(getBuckets());
    setBucketModal(false);
    setNewBucketName('');
    setNewBucketGoal('');
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
                  <Text style={[s.billAmt, { color: colors.funded }]}>${e.amount.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

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
                        backgroundColor: colors.emergency
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
              <Text style={[s.explanationText, { color: colors.teal }]}>
                💡 You have ${result.discretionary.toFixed(2)} left over.{'\n'}
                Add it to a savings bucket or keep it.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {buckets.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.bucketChip, { borderColor: b.color }]}
                    onPress={() => {
                      addToBucket(b.id, result.discretionary, 'from shift');
                      setBuckets(getBuckets());
                      Alert.alert('Added!', `$${result.discretionary.toFixed(2)} → ${b.name}`);
                    }}
                  >
                    <Text style={[s.bucketChipText, { color: b.color }]}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          <Text style={s.appName}>BudgetOS</Text>

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
                    ⚠ Need ${(2786.15 - monthly.projectedBills).toFixed(2)} more at current pace
                  </Text>
              }
            </View>
          )}

          {/* income type */}
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

          {/* shift date picker */}
          <Text style={s.sectionLabel}>SHIFT DATE</Text>
          <TouchableOpacity
            style={s.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={s.datePickerText}>
              📅 {dateOptions.find(d => d.key === shiftDate)?.label || formatDisplay(shiftDate)}
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
          <Text style={s.appName}>Budget</Text>

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
                ${monthly.totalBills.toFixed(2)} of $2,786.15 covered · ${monthly.billsRemaining.toFixed(2)} remaining
              </Text>
            </View>
          )}

          {/* per-bill progress */}
          {['1','2','3','4'].map(p => {
            const pLabel = p === '1' ? 'CRITICAL' : p === '2' ? 'HIGH' : p === '3' ? 'NORMAL' : 'LOW';
            const pColor = p === '1' ? colors.unfunded : p === '2' ? colors.emergency
              : p === '3' ? colors.savings : colors.textMuted;
            const bills = billProgress.filter(b => String(b.priority) === p);
            if (!bills.length) return null;

            return (
              <View key={p}>
                <Text style={[s.sectionLabel, { color: pColor, marginTop: 16 }]}>
                  {pLabel}
                </Text>
                {bills.map(b => {
                  const pct = Math.min(b.pct_funded, 100);
                  const isFullyFunded = pct >= 100;
                  const today = new Date();
                  const thisMonth = new Date(today.getFullYear(), today.getMonth(), b.due_day);
                  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, b.due_day);
                  const target = thisMonth >= today ? thisMonth : nextMonth;
                  const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

                  return (
                    <View key={b.id} style={s.budgetBillCard}>
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
                        <Text style={s.billSub}>
                          {pct.toFixed(0)}% funded · due in {daysLeft}d
                        </Text>
                        <Text style={s.billSub}>
                          ${(b.target - b.funded_total).toFixed(2)} left
                        </Text>
                      </View>
                    </View>
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
          <Text style={s.appName}>Insights</Text>

          {!insights && (
            <Text style={s.empty}>Log a few shifts to see insights</Text>
          )}

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

              <Text style={s.sectionLabel}>AVERAGE BY DAY OF WEEK</Text>
              {insights.dowAvgs.map(d => (
                <View key={d.name} style={s.dowRow}>
                  <Text style={[s.dowName,
                    d.name === insights.bestDay.name && { color: colors.teal }]}>
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

              {(() => {
                const cd = getDebtCountdown();
                const monthsComplete = 18 - cd.months;
                return (
                  <View style={[s.monthCard, { borderColor: colors.savings + '44', marginTop: 8 }]}>
                    <Text style={s.monthLabel}>CITI CARD PAYOFF COUNTDOWN</Text>
                    <Text style={[s.monthIncome, { color: colors.savings }]}>{cd.months} months left</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, {
                        width: `${(monthsComplete / 18) * 100}%`,
                        backgroundColor: colors.savings,
                      }]} />
                    </View>
                    <Text style={s.muted}>{cd.daysLeft} days · $280/mo freed when done</Text>
                    <Text style={[s.projText, { color: colors.savings }]}>
                      {Math.round((monthsComplete / 18) * 100)}% complete
                    </Text>
                  </View>
                );
              })()}

              <Text style={s.sectionLabel}>RECENT SHIFTS</Text>
              {history.slice(0, 10).map(h => (
                <View key={h.id} style={s.historyCard}>
                  <View style={s.historyTop}>
                    <Text style={s.historyAmt}>${h.amount.toFixed(2)}</Text>
                    <Text style={s.muted}>
                      {formatDisplay(h.shift_date)}
                    </Text>
                  </View>
                  <Text style={s.muted}>{h.note || h.income_type}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <Text style={[s.billSub, { color: colors.teal }]}>${(h.personal||0).toFixed(2)} personal</Text>
                    <Text style={[s.billSub, { color: colors.savings }]}>${h.savings.toFixed(2)} saved</Text>
                    <Text style={[s.billSub, { color: colors.emergency }]}>${h.emergency.toFixed(2)} emergency</Text>
                  </View>
                </View>
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
            Save toward goals. You decide where leftover money goes.
          </Text>

          {buckets.length === 0 && (
            <Text style={[s.empty, { marginTop: 40 }]}>No buckets yet</Text>
          )}

          {buckets.map(b => {
            const pct = b.goal_amount
              ? Math.min((b.current_balance / b.goal_amount) * 100, 100) : null;
            return (
              <View key={b.id} style={[s.budgetBillCard,
                { borderLeftWidth: 3, borderLeftColor: b.color }]}>
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
                  </>
                )}
                {addingToBucket === b.id ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TextInput
                      style={[s.input, { flex: 1, marginBottom: 0, padding: 10 }]}
                      placeholder="Amount"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
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
                      onPress={() => setAddingToBucket(null)}
                    >
                      <Text style={s.btnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.btn, { marginTop: 10, marginBottom: 0,
                      paddingVertical: 8, backgroundColor: colors.elevated }]}
                    onPress={() => setAddingToBucket(b.id)}
                  >
                    <Text style={s.btnText}>+ Add Money</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={s.tabItem} onPress={() => setTab(t)}>
            <Text style={s.tabIcon}>
              {t === 'Home' ? '⚡' : t === 'Budget' ? '📊' : t === 'Insights' ? '🔥' : '🪣'}
            </Text>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── DATE PICKER MODAL ── */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>When was this shift?</Text>
            {dateOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.dateOption, shiftDate === opt.key && s.dateOptionActive]}
                onPress={() => {
                  setShiftDate(opt.key);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[s.dateOptionText,
                  shiftDate === opt.key && { color: colors.teal }]}>
                  {opt.label}
                </Text>
                <Text style={s.muted}>{opt.key}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.elevated, marginTop: 8 }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={s.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── NEW BUCKET MODAL ── */}
      <Modal visible={bucketModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New Savings Bucket</Text>
            <TextInput
              style={s.input}
              placeholder="Name (e.g. Vacation, New Tires)"
              placeholderTextColor={colors.textDisabled}
              value={newBucketName}
              onChangeText={setNewBucketName}
            />
            <TextInput
              style={s.input}
              placeholder="Goal amount (optional)"
              placeholderTextColor={colors.textDisabled}
              keyboardType="decimal-pad"
              value={newBucketGoal}
              onChangeText={setNewBucketGoal}
            />
            <TouchableOpacity style={s.btn} onPress={handleCreateBucket}>
              <Text style={s.btnText}>Create Bucket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.elevated }]}
              onPress={() => setBucketModal(false)}
            >
              <Text style={s.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  tabIcon:       { fontSize: 18, marginBottom: 2 },
  tabLabel:      { fontSize: 10, color: colors.textDisabled, fontWeight: '600' },
  tabLabelActive:{ color: colors.teal },

  modalOverlay:  { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: colors.elevated, borderTopLeftRadius: 20,
                   borderTopRightRadius: 20, padding: 24, paddingBottom: 48 },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },

  dateOption:    { padding: 14, borderRadius: 10, marginBottom: 6,
                   backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                   flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateOptionActive: { borderColor: colors.teal },
  dateOptionText:{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

  stickyFooter:  { padding: 16, paddingBottom: 36, backgroundColor: colors.bg,
                   borderTopWidth: 1, borderTopColor: colors.border },
});