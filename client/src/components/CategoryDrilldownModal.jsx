import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';

const REASON_COLORS = [
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#64748b', // Slate
  '#d946ef', // Fuchsia
  '#0ea5e9', // Sky
];

export default function CategoryDrilldownModal({
  categoryName,
  categories = [],
  expenses = [],
  monthName = '',
  monthStr = '',
  currency = '₹',
  onClose,
  onSelectCategory,
  onDeleteTransaction,
  onAddTransaction,
}) {
  const [currentCategory, setCurrentCategory] = useState(categoryName);
  const [plotType, setPlotType] = useState('reasons'); // 'reasons' | 'timeline'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('amount'); // 'amount' | 'count' | 'name'
  const [selectedReasonKey, setSelectedReasonKey] = useState(null);
  const [expandedReasons, setExpandedReasons] = useState({});

  // Quick Add Form in Modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr.startsWith(monthStr) ? todayStr : `${monthStr}-01`;
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync when prop changes
  useEffect(() => {
    if (categoryName) {
      setCurrentCategory(categoryName);
    }
  }, [categoryName]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find metadata for current category
  const categoryMeta = useMemo(() => {
    const found = categories.find(
      (c) => c.name.toLowerCase() === (currentCategory || '').toLowerCase()
    );
    if (found) return found;
    return (
      categories.find((c) =>
        (currentCategory || '').toLowerCase().includes(c.name.toLowerCase())
      ) || {
        name: currentCategory || 'Category',
        icon: '🏷️',
        color: '#6366f1',
      }
    );
  }, [categories, currentCategory]);

  // Filter transactions belonging to this month and this category (excluding income)
  const categoryExpenses = useMemo(() => {
    const targetCat = (currentCategory || '').trim().toLowerCase();
    return expenses.filter((e) => {
      if (!e.date || !e.date.startsWith(monthStr)) return false;
      if (e.type === 'income') return false;
      const cat = (e.category || 'General & Others').trim().toLowerCase();
      return cat === targetCat || (targetCat === 'general & others' && cat === 'general');
    });
  }, [expenses, monthStr, currentCategory]);

  // Total spent in this category
  const totalCategorySpend = useMemo(() => {
    return categoryExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [categoryExpenses]);

  // Group by why reason
  const whyBreakdown = useMemo(() => {
    const map = {};
    categoryExpenses.forEach((item) => {
      const rawWhy = (item.why || 'Unspecified').trim();
      const normalized = rawWhy.toLowerCase();
      if (!map[normalized]) {
        map[normalized] = {
          key: normalized,
          why: rawWhy,
          totalAmount: 0,
          count: 0,
          transactions: [],
        };
      }
      const amt = Number(item.amount) || 0;
      map[normalized].totalAmount += amt;
      map[normalized].count += 1;
      map[normalized].transactions.push(item);
    });

    const list = Object.values(map).map((item, idx) => ({
      key: item.key,
      name: item.why,
      why: item.why,
      amount: item.totalAmount,
      value: item.totalAmount,
      count: item.count,
      avg: item.count > 0 ? Math.round(item.totalAmount / item.count) : 0,
      pct:
        totalCategorySpend > 0
          ? Math.round((item.totalAmount / totalCategorySpend) * 100)
          : 0,
      color: REASON_COLORS[idx % REASON_COLORS.length],
      transactions: item.transactions.sort((a, b) => (a.date > b.date ? -1 : 1)),
    }));

    if (sortBy === 'amount') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'count') {
      list.sort((a, b) => b.count - a.count);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [categoryExpenses, totalCategorySpend, sortBy]);

  // Filtered reasons by search query
  const filteredWhyList = useMemo(() => {
    if (!searchQuery.trim()) return whyBreakdown;
    const q = searchQuery.toLowerCase().trim();
    return whyBreakdown.filter((item) => item.why.toLowerCase().includes(q));
  }, [whyBreakdown, searchQuery]);

  // Daily timeline data for this category
  const dailyTimelineData = useMemo(() => {
    if (!monthStr) return [];
    const [yStr, mStr] = monthStr.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const totalDays = new Date(year, month, 0).getDate();

    const data = [];
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const dayTxns = categoryExpenses.filter((e) => e.date === dateStr);
      const spend = dayTxns.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      data.push({
        day,
        label: `${day}`,
        date: dateStr,
        spend,
        count: dayTxns.length,
      });
    }
    return data;
  }, [monthStr, categoryExpenses]);

  // Average spend per reason
  const avgReasonSpend = useMemo(() => {
    if (whyBreakdown.length === 0) return 0;
    return Math.round(totalCategorySpend / whyBreakdown.length);
  }, [totalCategorySpend, whyBreakdown.length]);

  // Toggle reason accordion
  const toggleReasonExpand = (key) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Switch category
  const handleSwitchCategory = (newCat) => {
    setCurrentCategory(newCat);
    setSelectedReasonKey(null);
    setSearchQuery('');
    if (onSelectCategory) {
      onSelectCategory(newCat);
    }
  };

  // Quick Add submit
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!newWhy.trim()) {
      alert('Please enter a why / reason');
      return;
    }

    try {
      setSubmitting(true);
      if (onAddTransaction) {
        await onAddTransaction({
          amount: Number(newAmount),
          why: newWhy.trim(),
          date: newDate,
          category: currentCategory,
          type: 'spend',
        });
      }
      setNewAmount('');
      setNewWhy('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add transaction in category drilldown', err);
      alert('Error creating transaction: ' + (err.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-drilldown-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl my-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Category Icon, Name, Month, Close Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm flex-shrink-0"
              style={{
                backgroundColor: `${categoryMeta.color}18`,
                border: `1.5px solid ${categoryMeta.color}40`,
              }}
            >
              {categoryMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-display">
                  Category Deep Dive &amp; Why Breakdown
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {monthName}
                </span>
              </div>
              <h2
                id="category-drilldown-title"
                className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white"
              >
                {categoryMeta.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showAddForm ? '✕ Cancel' : '+ Add in this Category'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold text-sm transition cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Category Switcher Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Switch Category:</span>
            <span className="text-slate-400">
              {categories.length} categories available
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {categories.map((cat) => {
              const isSelected =
                cat.name.toLowerCase() === currentCategory.toLowerCase();
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => handleSwitchCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* High-Level Metric Stat Cards for this Category */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Total Spent
            </span>
            <span className="text-lg sm:text-xl font-black font-display text-rose-600 dark:text-rose-400 block mt-0.5">
              {currency}
              {totalCategorySpend.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">
              in {monthName}
            </span>
          </div>

          <div className="p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Why Reasons
            </span>
            <span className="text-lg sm:text-xl font-black font-display text-indigo-600 dark:text-indigo-400 block mt-0.5">
              {whyBreakdown.length}
            </span>
            <span className="text-[10px] text-slate-400 block">
              distinct causes
            </span>
          </div>

          <div className="p-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Transactions
            </span>
            <span className="text-lg sm:text-xl font-black font-display text-amber-600 dark:text-amber-400 block mt-0.5">
              {categoryExpenses.length}
            </span>
            <span className="text-[10px] text-slate-400 block">
              entries logged
            </span>
          </div>

          <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Avg per Txn
            </span>
            <span className="text-lg sm:text-xl font-black font-display text-slate-800 dark:text-slate-200 block mt-0.5">
              {currency}
              {categoryExpenses.length > 0
                ? Math.round(totalCategorySpend / categoryExpenses.length).toLocaleString()
                : 0}
            </span>
            <span className="text-[10px] text-slate-400 block">average debit</span>
          </div>
        </div>

        {/* Quick Add Form Drawer (Toggled by Button) */}
        {showAddForm && (
          <form
            onSubmit={handleQuickAdd}
            className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>➕</span> Log New Expense in {categoryMeta.name}
              </span>
              <span className="text-[10px] text-slate-500">
                Pre-selected: {categoryMeta.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Why / Reason *
                </label>
                <input
                  type="text"
                  placeholder="e.g. coffee, lunch, printouts"
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Date *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    {submitting ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Charts Section: Pie Chart on this category + Plot (Bar Chart or Timeline) */}
        {whyBreakdown.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart 1: The Category Pie Chart broken down by Why reasons */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🥧</span> {categoryMeta.name} Reasons Pie Chart
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Distribution of why money was spent in this category
                    </p>
                  </div>
                  {selectedReasonKey && (
                    <button
                      type="button"
                      onClick={() => setSelectedReasonKey(null)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
                  <div className="h-52 w-52 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={whyBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          className="cursor-pointer"
                          onClick={(entry) => {
                            if (entry && entry.key) {
                              setSelectedReasonKey((prev) =>
                                prev === entry.key ? null : entry.key
                              );
                            }
                          }}
                        >
                          {whyBreakdown.map((entry) => (
                            <Cell
                              key={`why-cell-${entry.key}`}
                              fill={entry.color}
                              stroke={
                                selectedReasonKey === entry.key
                                  ? '#ffffff'
                                  : 'transparent'
                              }
                              strokeWidth={2}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl bg-slate-900 text-white p-2.5 shadow-xl text-xs space-y-1 border border-slate-700">
                                  <div className="font-bold flex items-center gap-1.5 capitalize">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: d.color }}
                                    />
                                    <span>{d.name}</span>
                                  </div>
                                  <div className="text-rose-400 font-black">
                                    {currency}
                                    {d.value.toLocaleString()} ({d.pct}%)
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {d.count} transaction(s) • avg {currency}
                                    {d.avg}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Reasons Mini Legend */}
                  <div className="flex-1 w-full space-y-1 max-h-48 overflow-y-auto pr-1">
                    {whyBreakdown.map((item) => {
                      const isHighlighted =
                        selectedReasonKey === item.key || !selectedReasonKey;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setSelectedReasonKey((prev) =>
                              prev === item.key ? null : item.key
                            )
                          }
                          className={`w-full flex items-center justify-between text-xs p-1.5 rounded-xl transition cursor-pointer text-left ${
                            selectedReasonKey === item.key
                              ? 'bg-indigo-100 dark:bg-indigo-950/80 font-bold'
                              : isHighlighted
                              ? 'hover:bg-slate-100 dark:hover:bg-slate-800'
                              : 'opacity-40 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-800 dark:text-slate-200 capitalize truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 font-bold">
                            <span className="text-slate-900 dark:text-white">
                              {currency}
                              {item.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 min-w-[28px] text-right">
                              {item.pct}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 2: Plot the Reasons! (Bar Chart Plot or Daily Timeline) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>📊</span> Plot: {categoryMeta.name} Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {plotType === 'reasons'
                        ? `Spendings plotted by reason (Avg: ${currency}${avgReasonSpend})`
                        : `Day-by-day spending trend for ${categoryMeta.name}`}
                    </p>
                  </div>

                  {/* Switch Plot type: Reasons Bar Chart vs Daily Timeline */}
                  <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPlotType('reasons')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        plotType === 'reasons'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Reasons Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlotType('timeline')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        plotType === 'timeline'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Daily Timeline
                    </button>
                  </div>
                </div>

                {/* Plot Area */}
                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    {plotType === 'reasons' ? (
                      <BarChart
                        data={whyBreakdown}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.15}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#888' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickFormatter={(v) => `${currency}${v}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl bg-slate-900 text-white p-2.5 shadow-xl text-xs space-y-1 border border-slate-700">
                                  <div className="font-bold capitalize">{d.name}</div>
                                  <div className="text-rose-400 font-black">
                                    Amount: {currency}
                                    {d.amount.toLocaleString()} ({d.pct}%)
                                  </div>
                                  <div className="text-slate-400 text-[10px]">
                                    {d.count} transactions recorded
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={avgReasonSpend}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Bar
                          dataKey="amount"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          {whyBreakdown.map((entry) => (
                            <Cell
                              key={`bar-${entry.key}`}
                              fill={entry.color}
                              opacity={
                                selectedReasonKey &&
                                selectedReasonKey !== entry.key
                                  ? 0.35
                                  : 1
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <AreaChart
                        data={dailyTimelineData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="catTimelineGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={categoryMeta.color || '#6366f1'}
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor={categoryMeta.color || '#6366f1'}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.15}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#888' }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#888' }}
                          tickFormatter={(v) => `${currency}${v}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl bg-slate-900 text-white p-2.5 shadow-xl text-xs space-y-1 border border-slate-700">
                                  <div className="font-bold text-slate-300">
                                    Day {d.day} ({d.date})
                                  </div>
                                  <div className="text-rose-400 font-black">
                                    Spent: {currency}
                                    {d.spend.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {d.count} transaction(s)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="spend"
                          stroke={categoryMeta.color || '#6366f1'}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#catTimelineGrad)"
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* List Using the Why Reasons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🏷️</span> Why Reasons List &amp; Breakdown (
                    {filteredWhyList.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aggregated expenses grouped by reason. Click any reason to see individual transactions.
                  </p>
                </div>

                {/* Search & Sort Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search reasons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-2.5 py-1.5 pl-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">
                      🔍
                    </span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sort selector */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="amount">Sort: Amount (High to Low)</option>
                    <option value="count">Sort: Most Frequent</option>
                    <option value="name">Sort: Reason (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* List of Reasons Cards */}
              <div className="space-y-2.5">
                {filteredWhyList.map((item, idx) => {
                  const isExpanded = !!expandedReasons[item.key];
                  const isFiltered =
                    selectedReasonKey && selectedReasonKey === item.key;
                  return (
                    <div
                      key={item.key}
                      className={`rounded-2xl border transition-all ${
                        isFiltered
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-1 ring-indigo-400/50'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Reason Summary Row */}
                      <div
                        onClick={() => toggleReasonExpand(item.key)}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black font-display text-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          >
                            #{idx + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white capitalize truncate">
                                {item.why}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                                {item.count} entry{item.count > 1 ? 'ies' : ''}
                              </span>
                            </div>

                            {/* Ratio progress bar */}
                            <div className="w-28 sm:w-48 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(4, item.pct)}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm sm:text-base font-black font-display text-rose-600 dark:text-rose-400">
                              {currency}
                              {item.amount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {item.pct}% of category
                            </div>
                          </div>

                          <span className="text-slate-400 text-xs transition-transform transform duration-200">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Sub-transactions for this reason */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-2 animate-fade-in bg-slate-50/60 dark:bg-slate-900/40 rounded-b-2xl">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
                            Individual Transactions for &ldquo;{item.why}&rdquo;:
                          </div>

                          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                            {item.transactions.map((txn) => (
                              <div
                                key={txn._id}
                                className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                    📅 {txn.date}
                                  </span>
                                  {txn.notes && (
                                    <span className="text-slate-500 dark:text-slate-400 italic">
                                      ({txn.notes})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-rose-600 dark:text-rose-400">
                                    -{currency}
                                    {Number(txn.amount).toLocaleString()}
                                  </span>

                                  {onDeleteTransaction && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteTransaction(txn._id)}
                                      className="text-slate-400 hover:text-rose-500 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                      title="Delete transaction"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredWhyList.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No reasons matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state when this category has no expenses logged */
          <div className="py-12 px-4 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
            <span className="text-4xl block">✨</span>
            <h3 className="text-base font-bold font-display text-slate-800 dark:text-slate-200">
              No expenses recorded for {categoryMeta.name} in {monthName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no spending transactions categorized under &ldquo;
              {categoryMeta.name}&rdquo; for this month yet.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition"
            >
              + Log First Expense in {categoryMeta.name}
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">ESC</kbd> or click outside to dismiss
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

