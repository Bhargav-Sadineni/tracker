import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label={`Toggle theme (currently ${theme})`}
      className="group relative flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur hover:border-slate-300 dark:hover:border-slate-700 transition"
    >
      <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-sm">
        {theme === 'dark' ? (
          <span className="text-amber-400 group-hover:rotate-12 transition-transform">🌙</span>
        ) : (
          <span className="text-amber-500 group-hover:rotate-45 transition-transform">☀️</span>
        )}
      </div>
      <span className="hidden sm:inline capitalize font-medium text-xs">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
