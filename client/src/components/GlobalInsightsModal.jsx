import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16'];

export default function GlobalInsightsModal({ activities, entries, onClose }) {
  const categoryData = useMemo(() => {
    const counts = {};
    activities.forEach((a) => {
      const cat = a.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activities]);

  const completedEntriesCount = Object.values(entries).filter(
    (e) => (typeof e === 'object' ? (e.value > 0 || (e.timeStr && e.timeStr.length > 0) || (e.sleepTime && e.sleepTime.length > 0)) : e > 0)
  ).length;

  const exportAllData = () => {
    const allData = {
      exportedAt: new Date().toISOString(),
      activities,
      entries,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allData, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `tracker_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dl.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊</span> System Analytics & Insights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-level overview across all your habits and routines
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xl sm:text-2xl font-black font-display text-indigo-600 dark:text-indigo-400">
              {activities.length}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Total Habits</div>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xl sm:text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">
              {completedEntriesCount}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Check-ins Logged</div>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xl sm:text-2xl font-black font-display text-amber-500">
              {categoryData.length}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Categories</div>
          </div>
        </div>

        {/* Habit Balance: Positive vs Negative */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>⚖️</span> Habit Balance: Positive Routines vs. Negative Limits
            </h4>
            <span className="text-[10px] font-semibold text-slate-500">
              {activities.filter((a) => a.habitType !== 'negative').length} routines · {activities.filter((a) => a.habitType === 'negative').length} limits
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  🟢 Positive Habits (+)
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {activities.filter((a) => a.habitType !== 'negative').length}
                </span>
              </div>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 leading-tight">
                Routines focused on building discipline and growth (e.g. Solve DSA, Workouts, Reading).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  🔴 Negative Limits (−)
                </span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  {activities.filter((a) => a.habitType === 'negative').length}
                </span>
              </div>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 leading-tight">
                Limits to reduce or break bad habits (e.g. Screen Time, Smoking, Late Sleep).
              </p>
            </div>
          </div>
        </div>

        {categoryData.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <h4 className="text-sm font-bold font-display text-slate-900 dark:text-white mb-2">
              Habits by Category
            </h4>
            <div className="h-48 sm:h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 text-xs">
              {categoryData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-300">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Download Complete Backup</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Export all your habits, streaks, and check-in history as a JSON file.
            </p>
          </div>
          <button
            onClick={exportAllData}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            📥 Export All JSON
          </button>
        </div>
      </div>
    </div>
  );
}
