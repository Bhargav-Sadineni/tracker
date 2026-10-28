export default function MobileNav({ currentPage, onNavigate, targetsCount = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Habits', icon: '📊' },
    { id: 'targets', label: 'Targets', icon: '🎯', badge: targetsCount },
    { id: 'expenditure', label: 'Expenditure', icon: '💳' },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.45)]"
    >
      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
        {tabs.map((tab) => {
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-black shadow-sm ring-1 ring-indigo-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'
              }`}
            >
              <div className="relative text-xl leading-none">
                <span>{tab.icon}</span>
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] tracking-tight mt-1 ${isActive ? 'font-black' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
