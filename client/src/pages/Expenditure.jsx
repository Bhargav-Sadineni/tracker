import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { api, ymd } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

const CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
  { name: 'Printing & Supplies', icon: '🖨️', color: '#6366f1' },
  { name: 'Family & Transfers', icon: '👨‍👩‍👦', color: '#ec4899' },
  { name: 'Shopping & Clothes', icon: '🛍️', color: '#8b5cf6' },
  { name: 'Bills & Utilities', icon: '⚡', color: '#ef4444' },
  { name: 'Travel & Transport', icon: '🚗', color: '#06b6d4' },
  { name: 'Education & Books', icon: '📚', color: '#10b981' },
  { name: 'Health & Medical', icon: '💊', color: '#14b8a6' },
  { name: 'Salary & Income', icon: '💼', color: '#22c55e' },
  { name: 'General & Others', icon: '📝', color: '#64748b' },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function Expenditure({ onNavigate }) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  // Current selected month: YYYY-MM
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [showExportMenu, setShowExportMenu] = useState(false);

  // View mode: 'calendar' | 'analysis'
  const [viewMode, setViewMode] = useState('calendar');
  // Analysis timeframe: '1m' | '3m' | '1y'
  const [analysisHorizon, setAnalysisHorizon] = useState('1m');

  // Transactions list
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Day modal/drawer state
  const [selectedDayStr, setSelectedDayStr] = useState(null);

  // New Transaction Form State (for modal or quick add)
  const [formAmount, setFormAmount] = useState('');
  const [formWhy, setFormWhy] = useState('');
  const [formType, setFormType] = useState('spend'); // 'spend' | 'income'
  const [formCategory, setFormCategory] = useState('General & Others');
  const [formDate, setFormDate] = useState(todayStr);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Always Indian Rupee (₹)
  const currency = '₹';

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Fetch all expenses (or for horizon)
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await api('/expenses');
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Sync formDate whenever a day is selected
  useEffect(() => {
    if (selectedDayStr) {
      setFormDate(selectedDayStr);
    }
  }, [selectedDayStr]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDayStr(null);
        setShowMonthPicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Change month helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Filter expenses strictly for the selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(monthStr));
  }, [expenses, monthStr]);

  // Aggregate monthly stats
  const monthStats = useMemo(() => {
    let income = 0;
    let spendings = 0;
    let spendCount = 0;
    let incomeCount = 0;

    monthExpenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'income') {
        income += amt;
        incomeCount++;
      } else {
        spendings += amt;
        spendCount++;
      }
    });

    const netBalance = income - spendings;
    const savingsRate = income > 0 ? Math.max(0, Math.round(((income - spendings) / income) * 100)) : 0;

    return {
      income,
      spendings,
      netBalance,
      savingsRate,
      spendCount,
      incomeCount,
      totalTxns: monthExpenses.length,
    };
  }, [monthExpenses]);

  // Map expenses by day for rapid calendar lookup
  const dayExpenseMap = useMemo(() => {
    const map = {};
    monthExpenses.forEach((e) => {
      if (!map[e.date]) {
        map[e.date] = {
          items: [],
          spendTotal: 0,
          incomeTotal: 0,
        };
      }
      map[e.date].items.push(e);
      const amt = Number(e.amount) || 0;
      if (e.type === 'income') {
        map[e.date].incomeTotal += amt;
      } else {
        map[e.date].spendTotal += amt;
      }
    });
    return map;
  }, [monthExpenses]);

  // Days in month calculation for the calendar grid
  const calendarDays = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const list = [];

    // Empty leading padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      list.push({ isPadding: true, key: `pad-${i}` });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dStr = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
      const dayData = dayExpenseMap[dStr] || { items: [], spendTotal: 0, incomeTotal: 0 };
      const isToday = dStr === todayStr;

      list.push({
        isPadding: false,
        key: dStr,
        dateStr: dStr,
        dayNum,
        spendTotal: dayData.spendTotal,
        incomeTotal: dayData.incomeTotal,
        itemsCount: dayData.items.length,
        items: dayData.items,
        isToday,
      });
    }

    return list;
  }, [currentYear, currentMonth, monthStr, dayExpenseMap, todayStr]);

  // Create new transaction handler
  const handleCreateTransaction = async (e) => {
    if (e) e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!formWhy.trim()) {
      alert('Please enter why / reason for this transaction');
      return;
    }

    try {
      setFormSubmitting(true);
      const created = await api('/expenses', 'POST', {
        date: formDate,
        amount: Number(formAmount),
        why: formWhy.trim(),
        type: formType,
        category: formCategory,
      });

      setExpenses((prev) => [created, ...prev]);
      setFormAmount('');
      setFormWhy('');
    } catch (err) {
      console.error('Failed to create transaction', err);
      alert('Error creating transaction: ' + (err.message || 'Server error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete transaction handler
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api(`/expenses/${id}`, 'DELETE');
      setExpenses((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      console.error('Failed to delete transaction', err);
    }
  };

  // Download monthly expenditure report as CSV
  const handleDownloadCSV = () => {
    const lines = [];

    // Metadata header
    lines.push(`"MONTHLY EXPENDITURE REPORT"`);
    lines.push(`"Month","${monthName}"`);
    lines.push(`"Exported On","${new Date().toLocaleString()}"`);
    lines.push(`"Currency","INR (${currency})"`);
    lines.push(`"Total Income","${monthStats.income}"`);
    lines.push(`"Total Spendings","${monthStats.spendings}"`);
    lines.push(`"Net Balance / Savings","${monthStats.netBalance}"`);
    lines.push(`"Savings Rate","${monthStats.savingsRate}%"`);
    lines.push(`"Total Transactions","${monthExpenses.length}"`);
    lines.push('');

    // Table Columns
    lines.push(`"Date","Type","Why / Description","Category","Amount (${currency})"`);

    // Sort by date ascending
    const sorted = [...monthExpenses].sort((a, b) => (a.date > b.date ? 1 : -1));

    if (sorted.length === 0) {
      lines.push(`"No transactions logged for this month","","","",""`);
    } else {
      sorted.forEach((item) => {
        const date = item.date || '';
        const type = item.type === 'income' ? 'Income' : 'Spend';
        const why = (item.why || '').replace(/"/g, '""');
        const category = (item.category || 'General').replace(/"/g, '""');
        const amount = item.amount || 0;
        lines.push(`"${date}","${type}","${why}","${category}","${amount}"`);
      });
    }

    // Summary totals at bottom
    lines.push('');
    lines.push(`"TOTAL INCOME","","","","${monthStats.income}"`);
    lines.push(`"TOTAL SPENDINGS","","","","${monthStats.spendings}"`);
    lines.push(`"NET BALANCE / SAVINGS","","","","${monthStats.netBalance}"`);

    // Add UTF-8 BOM so Excel opens with proper character encoding
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeMonth = monthName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Monthly_Expenditure_${safeMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleCopySummary = () => {
    const text = `Monthly Expenditure Summary - ${monthName}\n` +
      `• Total Income: ${currency}${monthStats.income.toLocaleString()}\n` +
      `• Total Spendings: ${currency}${monthStats.spendings.toLocaleString()}\n` +
      `• Net Balance: ${monthStats.netBalance >= 0 ? '+' : '-'}${currency}${Math.abs(monthStats.netBalance).toLocaleString()}\n` +
      `• Savings Rate: ${monthStats.savingsRate}%\n` +
      `• Total Transactions: ${monthExpenses.length}`;
    navigator.clipboard.writeText(text);
    alert('Monthly summary copied to clipboard!');
    setShowExportMenu(false);
  };

  // Selected day items for modal/drawer
  const selectedDayData = useMemo(() => {
    if (!selectedDayStr) return null;
    const items = expenses.filter((e) => e.date === selectedDayStr);
    const spendTotal = items
      .filter((e) => e.type !== 'income')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const incomeTotal = items
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const dateObj = new Date(selectedDayStr + 'T00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      dateStr: selectedDayStr,
      formattedDate,
      items,
      spendTotal,
      incomeTotal,
      net: incomeTotal - spendTotal,
    };
  }, [selectedDayStr, expenses]);

  // ANALYSIS DATA CALCULATIONS

  // 1. Day-by-day spendings & income for current month
  const dailyAnalysisData = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const data = [];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dStr = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
      const dayData = dayExpenseMap[dStr] || { items: [], spendTotal: 0, incomeTotal: 0 };

      data.push({
        day: dayNum,
        label: `${dayNum}`,
        date: dStr,
        spend: dayData.spendTotal,
        income: dayData.incomeTotal,
        itemsCount: dayData.items.length,
      });
    }

    return data;
  }, [currentYear, currentMonth, monthStr, dayExpenseMap]);

  // Average daily spend for month
  const avgDailySpend = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    return totalDays > 0 ? Math.round((monthStats.spendings / totalDays) * 10) / 10 : 0;
  }, [monthStats.spendings, currentYear, currentMonth]);

  // 2. Multi-horizon comparison bar chart (1 Month, 3 Months, 1 Year)
  const horizonBarData = useMemo(() => {
    if (analysisHorizon === '1m') {
      // 1 Month: 4 Weeks breakdown
      const weeks = [
        { name: 'Week 1 (1-7)', spend: 0, income: 0 },
        { name: 'Week 2 (8-14)', spend: 0, income: 0 },
        { name: 'Week 3 (15-21)', spend: 0, income: 0 },
        { name: 'Week 4 (22+)', spend: 0, income: 0 },
      ];

      monthExpenses.forEach((e) => {
        const day = parseInt(e.date.split('-')[2], 10);
        const amt = Number(e.amount) || 0;
        const targetWeek = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
        if (e.type === 'income') {
          weeks[targetWeek].income += amt;
        } else {
          weeks[targetWeek].spend += amt;
        }
      });
      return weeks;
    }

    if (analysisHorizon === '3m') {
      // 3 Months comparison
      const list = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const mKey = `${y}-${m}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });

        const mExpenses = expenses.filter((e) => e.date && e.date.startsWith(mKey));
        let spend = 0;
        let income = 0;
        mExpenses.forEach((e) => {
          const amt = Number(e.amount) || 0;
          if (e.type === 'income') income += amt;
          else spend += amt;
        });

        list.push({ name: label, fullMonth: mKey, spend, income });
      }
      return list;
    }

    // 1 Year comparison (Past 12 months)
    const list = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const mKey = `${y}-${m}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      const mExpenses = expenses.filter((e) => e.date && e.date.startsWith(mKey));
      let spend = 0;
      let income = 0;
      mExpenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (e.type === 'income') income += amt;
        else spend += amt;
      });

      list.push({ name: label, fullMonth: mKey, spend, income });
    }
    return list;
  }, [analysisHorizon, monthExpenses, expenses, currentYear, currentMonth]);

  // 3. Category Pie Chart Data for Spendings
  const categoryPieData = useMemo(() => {
    const catMap = {};
    monthExpenses
      .filter((e) => e.type !== 'income')
      .forEach((e) => {
        const cat = e.category || 'General & Others';
        catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
      });

    const totalSpend = monthStats.spendings || 1;
    const colors = [
      '#f59e0b',
      '#6366f1',
      '#ec4899',
      '#8b5cf6',
      '#ef4444',
      '#06b6d4',
      '#10b981',
      '#14b8a6',
      '#f97316',
      '#64748b',
    ];

    return Object.entries(catMap)
      .map(([name, value], idx) => ({
        name,
        value,
        pct: Math.round((value / totalSpend) * 100),
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, monthStats.spendings]);

  // Top spending reasons/why
  const topWhyList = useMemo(() => {
    const map = {};
    monthExpenses
      .filter((e) => e.type !== 'income')
      .forEach((e) => {
        const w = e.why.toLowerCase().trim();
        map[w] = (map[w] || 0) + (Number(e.amount) || 0);
      });

    return Object.entries(map)
      .map(([why, amount]) => ({ why, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthExpenses]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 sm:px-8 py-3 transition-colors">
        <div className="w-full max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Tabs */}
          <div className="flex items-center justify-between sm:justify-start gap-4 flex-wrap">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div>
                <span className="font-black text-2xl sm:text-3xl font-display tracking-tight text-slate-900 dark:text-white">
                  Tracker
                </span>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Monthly Expenditure &amp; Financial Analytics
                </p>
              </div>

              {/* Mobile Top-Right: Dark Mode Toggle */}
              <div className="sm:hidden flex items-center shrink-0">
                <ThemeToggle />
              </div>
            </div>

            {/* Navigation Tabs (Desktop only - Mobile uses bottom dock) */}
            <nav className="hidden sm:flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📊</span>
                <span>Habits Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('targets')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🎯</span>
                <span>Targets &amp; Deadlines</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition flex items-center gap-1.5 font-extrabold"
              >
                <span>💳</span>
                <span>Monthly Expenditure</span>
              </button>
            </nav>
          </div>

          {/* Header Controls: Theme Toggle & Quick Add Transaction */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end sm:justify-start flex-wrap">
            {/* Desktop Theme Toggle (Laptop Only) */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Quick Add Transaction Button */}
            <button
              type="button"
              onClick={() => {
                setFormDate(todayStr);
                setSelectedDayStr(todayStr);
              }}
              className="w-full sm:w-auto px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <span className="text-sm leading-none">+</span>
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with bottom padding for mobile dock */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-3.5 sm:px-8 py-5 pb-28 sm:pb-8 space-y-6">
        {/* Top Header Card: Month Switcher & High-Level Statistics (As drawn in sketch) */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Monthly Expenditure & Month Name Navigator */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block font-display">
                Monthly Expenditure
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setPickerYear(currentYear);
                    setShowMonthPicker(true);
                  }}
                  className="group inline-flex items-center gap-2 text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-left"
                  title="Click to change month"
                >
                  <span>{monthName}</span>
                  <span className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 group-hover:text-indigo-600 font-bold transition flex items-center gap-1 shadow-sm">
                    <span>Change</span>
                    <span className="text-[10px]">▼</span>
                  </span>
                </button>

                {/* Month Navigator Buttons */}
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Previous Month"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px]"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Next Month"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Middle & Right: Income, Spendings, Net Cards + Analysis Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              {/* Income, Spend, Net Balance ALL IN ONE ROW in mobile view */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
                {/* Income Metric Card */}
                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 sm:px-4 sm:py-2.5 min-w-0 sm:min-w-[125px] flex flex-col justify-between">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block truncate">
                    Income
                  </span>
                  <span className="text-xs sm:text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-display truncate">
                    +{currency}{monthStats.income >= 100000 ? `${(monthStats.income / 1000).toFixed(1)}k` : monthStats.income.toLocaleString()}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5 truncate">
                    {monthStats.incomeCount} credits
                  </span>
                </div>

                {/* Spend Metric Card */}
                <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-2 sm:px-4 sm:py-2.5 min-w-0 sm:min-w-[125px] flex flex-col justify-between">
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block truncate">
                    Spend
                  </span>
                  <span className="text-xs sm:text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-display truncate">
                    -{currency}{monthStats.spendings >= 100000 ? `${(monthStats.spendings / 1000).toFixed(1)}k` : monthStats.spendings.toLocaleString()}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5 truncate">
                    {monthStats.spendCount} debits
                  </span>
                </div>

                {/* Net Balance / Savings Card */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2 sm:px-4 sm:py-2.5 min-w-0 sm:min-w-[125px] flex flex-col justify-between">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                    Net Balance
                  </span>
                  <span className={`text-xs sm:text-lg sm:text-xl font-black font-display truncate ${
                    monthStats.netBalance >= 0
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-amber-500'
                  }`}>
                    {monthStats.netBalance >= 0 ? '+' : '-'}{currency}{Math.abs(monthStats.netBalance) >= 100000 ? `${(Math.abs(monthStats.netBalance) / 1000).toFixed(1)}k` : Math.abs(monthStats.netBalance).toLocaleString()}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block mt-0.5 truncate">
                    {monthStats.savingsRate}% saved
                  </span>
                </div>
              </div>

              {/* View Switcher: Calendar vs Analysis */}
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-bold shadow-inner w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📅</span>
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('analysis')}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    viewMode === 'analysis'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📈</span>
                  <span>Analysis</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 1. CALENDAR VIEW (Display all the days in that month & amount spent below each day) */}
        {viewMode === 'calendar' && (
          <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-2.5 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1 sm:px-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                  Monthly Days &amp; Spendings Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any day to see spendings, why, and add transactions
              </p>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid: Decongested for mobile, exact spacious look preserved for laptop */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
              {calendarDays.map((cell) => {
                if (cell.isPadding) {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[58px] sm:min-h-[96px] rounded-xl sm:rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
                    />
                  );
                }

                const hasSpend = cell.spendTotal > 0;
                const hasIncome = cell.incomeTotal > 0;
                const isSelected = selectedDayStr === cell.dateStr;

                return (
                  <div
                    key={cell.key}
                    onClick={() => {
                      setSelectedDayStr(cell.dateStr);
                      setFormDate(cell.dateStr);
                    }}
                    className={`min-h-[58px] sm:min-h-[102px] p-1 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/25 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : cell.isToday
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : hasSpend
                        ? 'border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-slate-850 hover:border-rose-300'
                        : hasIncome
                        ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-white dark:bg-slate-850 hover:border-emerald-300'
                        : 'border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-850/60 hover:border-slate-300'
                    }`}
                  >
                    {/* Top: Day Number & Today indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-black font-display leading-none ${
                          cell.isToday
                            ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] sm:text-xs shadow-sm'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {cell.itemsCount > 0 && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {cell.itemsCount}
                        </span>
                      )}
                    </div>

                    {/* Bottom: LAPTOP VIEW (Kept as it is for laptop view) */}
                    <div className="hidden sm:block mt-1 space-y-0.5">
                      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                        Total Spend
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-black truncate ${
                          hasSpend
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400 dark:text-slate-500 font-medium'
                        }`}
                      >
                        {currency}{cell.spendTotal.toLocaleString()}
                      </div>
                      {hasIncome && (
                        <div className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                          +{currency}{cell.incomeTotal.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Bottom: MOBILE VIEW (Clean, single-line, uncongested!) */}
                    <div className="sm:hidden mt-0.5 flex flex-col items-center justify-center text-center">
                      {hasSpend ? (
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none block truncate max-w-full">
                          -{currency}{cell.spendTotal >= 10000 ? `${(cell.spendTotal / 1000).toFixed(0)}k` : cell.spendTotal}
                        </span>
                      ) : hasIncome ? (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block truncate max-w-full">
                          +{currency}{cell.incomeTotal >= 10000 ? `${(cell.incomeTotal / 1000).toFixed(0)}k` : cell.incomeTotal}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300 dark:text-slate-700 leading-none block">·</span>
                      )}
                      {hasSpend && hasIncome && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" title="Has income" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile-only Selected Day Quick Summary Card */}
            <div className="sm:hidden pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Day: {selectedDayStr || todayStr}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-display">
                      Spent: {currency}{calendarDays.find((d) => d.dateStr === (selectedDayStr || todayStr))?.spendTotal || 0}
                    </span>
                    {(calendarDays.find((d) => d.dateStr === (selectedDayStr || todayStr))?.incomeTotal || 0) > 0 && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-display">
                        Income: +{currency}{calendarDays.find((d) => d.dateStr === (selectedDayStr || todayStr))?.incomeTotal}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const dStr = selectedDayStr || todayStr;
                    setSelectedDayStr(dStr);
                    setFormDate(dStr);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm active:scale-95 transition"
                >
                  View / Add
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 2. ANALYSIS VIEW (Contains the Download Option & Multi-Horizon Analysis) */}
        {viewMode === 'analysis' && (
          <div className="space-y-6">
            {/* Top Analysis Header & Horizon Selector + Download Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📈</span> Detailed Financial Analysis
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Day-by-day spendings, multi-horizon comparisons (1M, 3M, 1Y), and category breakdown
                </p>
              </div>

              {/* Right Controls: 1 Month, 3 Month, 1 Year horizon selector */}
              <div className="flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-bold">
                {[
                  { label: '1 Month', val: '1m' },
                  { label: '3 Months', val: '3m' },
                  { label: '1 Year', val: '1y' },
                ].map((hz) => (
                  <button
                    key={hz.val}
                    type="button"
                    onClick={() => setAnalysisHorizon(hz.val)}
                    className={`px-3 py-1 rounded-xl transition ${
                      analysisHorizon === hz.val
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {hz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart 1: "spendings on this month day by day" */}
            <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white">
                    📊 Daily Spendings on {monthName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Day-by-day expenditure pattern with average line ({currency}{avgDailySpend}/day)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-rose-500" />
                    <span>Daily Spend</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 border-t-2 border-dashed border-amber-500" />
                    <span>Avg ({currency}{avgDailySpend})</span>
                  </div>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyAnalysisData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(v) => `${currency}${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <div className="font-bold text-slate-300">
                                {d.date} (Day {d.day})
                              </div>
                              <div className="text-rose-400 font-black text-sm">
                                💸 Spend: {currency}{d.spend.toLocaleString()}
                              </div>
                              {d.income > 0 && (
                                <div className="text-emerald-400 font-bold">
                                  💰 Income: +{currency}{d.income.toLocaleString()}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400">
                                {d.itemsCount} transaction(s) recorded
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={avgDailySpend}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Bar dataKey="spend" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {dailyAnalysisData.map((entry, idx) => (
                        <Cell
                          key={`bar-${idx}`}
                          fill={entry.spend > avgDailySpend * 1.5 ? '#e11d48' : '#f43f5e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Grid: Multi-Horizon Bar Chart (1M/3M/1Y) + Category Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 2: Multi-Horizon Bar Chart (1 Month, 3 Month, 1 Year) */}
              <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white">
                      📊 Horizon Comparison ({analysisHorizon.toUpperCase()})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Income vs Spendings over {analysisHorizon === '1m' ? 'current month weeks' : analysisHorizon === '3m' ? 'past 3 months' : 'past 12 months'}
                    </p>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horizonBarData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#888' }}
                        tickFormatter={(v) => `${currency}${v}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-xl text-xs space-y-1.5 border border-slate-700">
                                <div className="font-bold text-slate-300">{d.name}</div>
                                <div className="text-rose-400 font-extrabold">
                                  Spendings: -{currency}{d.spend.toLocaleString()}
                                </div>
                                <div className="text-emerald-400 font-extrabold">
                                  Income: +{currency}{d.income.toLocaleString()}
                                </div>
                                <div className="text-indigo-300 font-extrabold pt-1 border-t border-slate-800">
                                  Net: {d.income - d.spend >= 0 ? '+' : '-'}{currency}{Math.abs(d.income - d.spend).toLocaleString()}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="spend" name="Spendings" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Chart 3: Category Pie Chart */}
              <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white">
                    🥧 Spending Categories Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Distribution of where your money goes this month
                  </p>
                </div>

                {categoryPieData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="h-56 w-56 relative flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {categoryPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => [`${currency}${val.toLocaleString()}`, 'Spent']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category Legend List */}
                    <div className="flex-1 w-full space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {categoryPieData.map((cat) => (
                        <div
                          key={cat.name}
                          className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-black flex-shrink-0">
                            <span className="text-slate-900 dark:text-white">
                              {currency}{cat.value.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold min-w-[32px] text-right">
                              {cat.pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span>No spending transactions recorded for {monthName} yet.</span>
                  </div>
                )}
              </section>
            </div>

            {/* Top Reasons / "Why" Ranking Section (Matches "why" column in sketch) */}
            <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-sm space-y-3">
              <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏷️</span> Top Spending Reasons &amp; Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Highest aggregated expenses by reason (e.g. food, print, nana)
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                {topWhyList.map((item, idx) => (
                  <div
                    key={item.why}
                    className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      #{idx + 1} Reason
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-display capitalize block mt-0.5 truncate">
                      {item.why}
                    </span>
                    <span className="text-xs font-black text-rose-500 font-display block mt-1">
                      {currency}{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {topWhyList.length === 0 && (
                  <div className="col-span-full py-4 text-center text-xs text-slate-400">
                    No reasons logged yet for this month.
                  </div>
                )}
              </div>
            </section>

            {/* Download Option at the BOTTOM of Analysis Tab */}
            <section className="p-5 sm:p-6 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block font-display">
                  Monthly Financial Export
                </span>
                <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white">
                  Download {monthName} Expenditure Report
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Export complete records of all {monthExpenses.length} transactions, category breakdowns, and net balances.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer min-h-[40px]"
                >
                  <span className="text-sm">📊</span>
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-black shadow-sm active:scale-95 transition flex items-center gap-2 cursor-pointer min-h-[40px]"
                >
                  <span className="text-sm">🖨️</span>
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-black shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  title="Copy text summary"
                >
                  <span className="text-sm">📋</span>
                  <span>Copy Summary</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 3. DAY DETAIL & ADD TRANSACTION MODAL / DRAWER (Exact match to diagram arrow) */}
      {selectedDayStr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedDayStr(null)}
        >
          <div
            className="w-full max-w-xl sm:max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block font-display">
                  Daily Spendings Log
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white">
                  {selectedDayData?.formattedDate}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayStr(null)}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Daily Totals Bar */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Spent Today</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-display">
                  -{currency}{selectedDayData?.spendTotal.toLocaleString() || 0}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Income Today</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-display">
                  +{currency}{selectedDayData?.incomeTotal.toLocaleString() || 0}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Result</span>
                <span className={`text-base font-black font-display ${
                  (selectedDayData?.net || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {(selectedDayData?.net || 0) >= 0 ? '+' : '-'}{currency}{Math.abs(selectedDayData?.net || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modern & Cleaner Add Transaction Form */}
            <form onSubmit={handleCreateTransaction} className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">➕</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Add Transaction
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                    {formDate || selectedDayStr}
                  </span>
                </div>

                {/* Type Switcher: Spend vs Income */}
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-xs font-bold shadow-inner">
                  <button
                    type="button"
                    onClick={() => setFormType('spend')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      formType === 'spend'
                        ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>💸</span>
                    <span>Spend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('income')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      formType === 'income'
                        ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>💰</span>
                    <span>Income</span>
                  </button>
                </div>
              </div>

              {/* Amount input & Quick Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400 select-none">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
                  />
                </div>
                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Quick:</span>
                  {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormAmount(amt.toString())}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                    >
                      +{currency}{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Why & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Reason / Why for this *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. food, printout, grocery, rent"
                    value={formWhy}
                    onChange={(e) => setFormWhy(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Date:</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className={`px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    formType === 'income'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-500/20'
                  }`}
                >
                  <span>{formType === 'income' ? '💰' : '💸'}</span>
                  <span>{formSubmitting ? 'Saving...' : `Save ${formType === 'income' ? 'Income' : 'Spend'}`}</span>
                </button>
              </div>
            </form>

            {/* List of transactions for this day (Matches the sketch table) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Logged Transactions ({selectedDayData?.items.length || 0})
              </span>

              {selectedDayData?.items && selectedDayData.items.length > 0 ? (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDayData.items.map((item) => {
                    const isIncome = item.type === 'income';
                    return (
                      <div
                        key={item._id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm ${
                            isIncome
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isIncome ? '💰' : '💸'}
                          </span>
                          <div>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white capitalize block">
                              {item.why}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {item.category || 'General'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`text-sm font-black font-display ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isIncome ? '+' : '-'}{currency}{Number(item.amount).toLocaleString()}
                            </span>
                            <span className={`text-[9px] font-bold uppercase block ${
                              isIncome ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {item.type}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(item._id)}
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition"
                            title="Delete transaction"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <span>No transactions recorded for this day yet. Use the form above to add one!</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDayStr(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MONTH & YEAR PICKER MODAL */}
      {showMonthPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMonthPicker(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block font-display">
                  Change Month
                </span>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  Monthly Horizon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthPicker(false)}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="h-8 w-8 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm flex items-center justify-center transition"
                title="Previous Year"
              >
                ◀
              </button>
              <span className="text-lg font-black font-display text-slate-900 dark:text-white">
                {pickerYear}
              </span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="h-8 w-8 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm flex items-center justify-center transition"
                title="Next Year"
              >
                ▶
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((mName, idx) => {
                const isSelected = currentMonth === idx && currentYear === pickerYear;
                const isThisMonth = today.getMonth() === idx && today.getFullYear() === pickerYear;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setCurrentYear(pickerYear);
                      setShowMonthPicker(false);
                    }}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                        : isThisMonth
                        ? 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                        : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{mName.slice(0, 3)}</span>
                    <span className="text-[10px] opacity-75 font-normal mt-0.5">
                      {isThisMonth ? 'Current' : mName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick jump to Today */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  handleGoToToday();
                  setShowMonthPicker(false);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 transition text-center"
              >
                Jump to Current Month ({new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
