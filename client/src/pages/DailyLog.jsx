import { useState, useEffect, useMemo, useRef } from 'react';
import { api, ymd, addDays } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import { triggerConfetti } from '../lib/confetti';
import {
  PenLine,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Save,
  Loader2,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Trophy,
  Copy,
  Trash2,
  Search,
  Sparkles,
  CreditCard,
  Download,
  List,
  CheckSquare,
  Lightbulb,
  Star,
  Plus,
  X,
  Tag,
  BarChart2,
  Target,
  Bookmark,
  FileEdit,
} from 'lucide-react';

const MOODS = [
  { emoji: '🤩', label: 'Awesome' },
  { emoji: '⚡', label: 'Productive' },
  { emoji: '😊', label: 'Good' },
  { emoji: '🧘', label: 'Peaceful' },
  { emoji: '🥱', label: 'Tired' },
  { emoji: '🌧️', label: 'Tough' },
];

const DEFAULT_TAGS = ['Work', 'Coding', 'Fitness', 'Learning', 'Health', 'Personal', 'Finance', 'Creative'];

export default function DailyLog({ onNavigate }) {
  const todayStr = useMemo(() => ymd(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Current Log State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [highlightInput, setHighlightInput] = useState('');
  const [mood, setMood] = useState('😊');
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showAddCustomTag, setShowAddCustomTag] = useState(false);

  // Status & Metadata
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saved' | 'dirty' | 'error' | ''
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [copied, setCopied] = useState(false);

  // History & Cross-integration State
  const [allLogs, setAllLogs] = useState([]);
  const [dayHabits, setDayHabits] = useState([]);
  const [dayExpenses, setDayExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'history' (on mobile)

  const textareaRef = useRef(null);

  // Format date readable
  const formattedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Relative label: Today, Yesterday, Tomorrow, etc.
  const relativeDateLabel = useMemo(() => {
    if (selectedDate === todayStr) return 'Today';
    const yesterday = ymd(addDays(-1));
    if (selectedDate === yesterday) return 'Yesterday';
    const tomorrow = ymd(addDays(1));
    if (selectedDate === tomorrow) return 'Tomorrow';

    try {
      const [y1, m1, d1] = selectedDate.split('-').map(Number);
      const [y2, m2, d2] = todayStr.split('-').map(Number);
      const diff = Math.round((new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2)) / 86400000);
      if (diff < 0) return `${Math.abs(diff)} days ago`;
      return `In ${diff} days`;
    } catch {
      return '';
    }
  }, [selectedDate, todayStr]);

  // Load all logs history
  const loadAllLogs = async () => {
    try {
      const logs = await api('/daily-logs');
      setAllLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Failed to load past logs', err);
    }
  };

  // Load specific log for selected date + cross-reference habits and expenses
  const loadDateData = async (date) => {
    setLoading(true);
    setSaveStatus('');
    try {
      const [logData, acts, ents, exps] = await Promise.all([
        api(`/daily-logs/${date}`).catch(() => null),
        api('/activities').catch(() => []),
        api(`/entries?from=${date}&to=${date}`).catch(() => []),
        api(`/expenses?date=${date}`).catch(() => []),
      ]);

      if (logData) {
        setTitle(logData.title || '');
        setContent(logData.content || '');
        setHighlights(Array.isArray(logData.highlights) ? logData.highlights : []);
        setMood(logData.mood || '😊');
        setRating(Number(logData.rating) || 4);
        setTags(Array.isArray(logData.tags) ? logData.tags : []);
        setLastSavedTime(
          logData.updatedAt
            ? new Date(logData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''
        );
      } else {
        // Reset to fresh blank entry
        setTitle('');
        setContent('');
        setHighlights([]);
        setMood('😊');
        setRating(4);
        setTags([]);
        setLastSavedTime('');
      }

      // Map habits completed for this date
      const entriesMap = {};
      (ents || []).forEach((e) => {
        entriesMap[e.activity] = e;
      });

      const completedHabits = (acts || [])
        .filter((act) => {
          const entry = entriesMap[act._id];
          if (!entry) return false;
          return entry.value > 0 || !!entry.timeStr || !!entry.sleepTime;
        })
        .map((act) => {
          const entry = entriesMap[act._id];
          return {
            id: act._id,
            name: act.name,
            icon: act.icon || '📌',
            measure: act.measure,
            entry,
          };
        });

      setDayHabits(completedHabits);
      setDayExpenses(exps || []);
    } catch (err) {
      console.error('Error loading date data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllLogs();
  }, []);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate]);

  // Handle Save
  const handleSave = async (silent = false) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        title,
        content,
        highlights,
        mood,
        rating,
        tags,
      };

      const saved = await api(`/daily-logs/${selectedDate}`, 'PUT', payload);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Update in allLogs cache
      setAllLogs((prev) => {
        const idx = prev.findIndex((l) => l.date === selectedDate);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      });

      if (!silent) {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Failed to save log', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, title, content, highlights, mood, rating, tags]);

  // Track dirty changes
  const markDirty = () => {
    if (saveStatus !== 'dirty') {
      setSaveStatus('dirty');
    }
  };

  // Add highlight/win
  const addHighlight = () => {
    const trimmed = highlightInput.trim();
    if (!trimmed) return;
    if (!highlights.includes(trimmed)) {
      setHighlights([...highlights, trimmed]);
      markDirty();
    }
    setHighlightInput('');
  };

  const removeHighlight = (idx) => {
    setHighlights(highlights.filter((_, i) => i !== idx));
    markDirty();
  };

  // Toggle tag
  const toggleTag = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
    markDirty();
  };

  // Add custom tag
  const addCustomTag = () => {
    const clean = customTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
      markDirty();
    }
    setCustomTagInput('');
    setShowAddCustomTag(false);
  };

  // Insert quick snippets into textarea
  const insertSnippet = (prefix, placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}\n`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    markDirty();

    setTimeout(() => {
      textarea.focus();
      const newPos = start + replacement.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Insert Completed Habits into text
  const importHabits = () => {
    if (!dayHabits.length) return;
    let habitSnippet = `\n### Completed Habits (${selectedDate}):\n`;
    dayHabits.forEach((h) => {
      let detail = '';
      if (h.measure === 'time') {
        detail = h.entry.value ? ` (${h.entry.value} mins)` : '';
      } else if (h.measure === 'sleep_wake') {
        detail = h.entry.sleepTime && h.entry.wakeTime ? ` (${h.entry.sleepTime} - ${h.entry.wakeTime})` : '';
      } else if (h.measure === 'count') {
        detail = h.entry.value ? ` (${h.entry.value} reps)` : '';
      }
      habitSnippet += `- [x] ${h.icon} ${h.name}${detail}\n`;
    });

    setContent((prev) => (prev ? prev.trimEnd() + '\n' + habitSnippet : habitSnippet));
    markDirty();
  };

  // Insert Expenses into text
  const importExpenses = () => {
    if (!dayExpenses.length) return;
    const totalSpent = dayExpenses
      .filter((e) => e.type !== 'income')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    let expSnippet = `\n### Daily Spending (${selectedDate}): Total ₹${totalSpent.toLocaleString('en-IN')}\n`;
    dayExpenses.forEach((e) => {
      const typeSign = e.type === 'income' ? '+₹' : '-₹';
      expSnippet += `- ${typeSign}${e.amount}: ${e.why} [${e.category || 'General'}]\n`;
    });

    setContent((prev) => (prev ? prev.trimEnd() + '\n' + expSnippet : expSnippet));
    markDirty();
  };

  // Delete current date log
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the daily log for ${selectedDate}?`)) return;
    try {
      await api(`/daily-logs/${selectedDate}`, 'DELETE');
      setAllLogs((prev) => prev.filter((l) => l.date !== selectedDate));
      setTitle('');
      setContent('');
      setHighlights([]);
      setMood('😊');
      setRating(4);
      setTags([]);
      setSaveStatus('');
      setLastSavedTime('');
    } catch (err) {
      console.error('Failed to delete log', err);
    }
  };

  // Copy summary to clipboard
  const copyToClipboard = () => {
    const text = [
      `Date: ${formattedDate} (${selectedDate})`,
      mood ? `Mood: ${mood} | Rating: ${'★'.repeat(rating)}` : '',
      title ? `Title: ${title}` : '',
      tags.length ? `Tags: ${tags.map((t) => '#' + t).join(' ')}` : '',
      highlights.length ? `\nWins:\n` + highlights.map((h) => `• ${h}`).join('\n') : '',
      content ? `\nWhat I Did:\n${content}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Metrics
  const wordCount = useMemo(() => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  }, [content]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 180));
  }, [wordCount]);

  // Filtered past logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (filterTag !== 'All' && (!l.tags || !l.tags.includes(filterTag))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (l.title || '').toLowerCase().includes(q);
        const matchContent = (l.content || '').toLowerCase().includes(q);
        const matchHighlights = (l.highlights || []).some((h) => h.toLowerCase().includes(q));
        const matchDate = l.date.includes(q);
        if (!matchTitle && !matchContent && !matchHighlights && !matchDate) return false;
      }
      return true;
    });
  }, [allLogs, filterTag, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl transition-colors">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo / Brand & Subtitle */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shadow-xs">
                <PenLine className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="font-black text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                  Daily Log
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  What did you achieve today?
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden sm:flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('dashboard')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Habits Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('targets')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Targets &amp; Deadlines</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('expenditure')}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Monthly Expenditure</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition flex items-center gap-1.5 font-extrabold"
              >
                <PenLine className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Daily Log</span>
              </button>
            </nav>
          </div>

          {/* Action buttons & Theme toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedDate === todayStr
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Today</span>
            </button>

            <ThemeToggle />

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-black text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition min-h-[36px] cursor-pointer"
              title="Save Daily Log (Ctrl + S)"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Log'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-3.5 sm:px-8 py-5 sm:py-6 pb-28 sm:pb-12 space-y-5 sm:space-y-6">
        {/* Date Selector Banner */}
        <section className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Prev / Next & Selected Date */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  setSelectedDate(ymd(addDays(-1, new Date(y, m - 1, d))));
                }}
                className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition flex items-center justify-center font-bold text-lg active:scale-95"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-black text-slate-800 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  {relativeDateLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  setSelectedDate(ymd(addDays(1, new Date(y, m - 1, d))));
                }}
                className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition flex items-center justify-center font-bold text-lg active:scale-95"
                title="Next Day"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.2]" />
              </button>

              <div className="hidden lg:block border-l border-slate-200 dark:border-slate-800 h-6 mx-2" />

              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {formattedDate}
              </span>
            </div>

            {/* Quick Status / Metrics on Right */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unsaved changes</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Failed to save</span>
                </span>
              )}

              <div className="hidden sm:flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-xl">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>{wordCount} words</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{readingTime} min read</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-slate-400" />
                  <span>{allLogs.length} days logged</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile View Switcher (Editor vs History) */}
        <div className="sm:hidden flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Daily Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Past Entries ({allLogs.length})</span>
          </button>
        </div>

        {/* Main Content Layout: Two Columns on Laptop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: The Daily Editor */}
          <div
            className={`space-y-6 ${
              activeTab === 'editor' ? 'block' : 'hidden lg:block'
            } lg:col-span-8`}
          >
            {/* Integrated Day Context Card (Habits completed + Expenditure logged) */}
            <div className="rounded-3xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Daily Activity Context</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {dayHabits.length > 0
                      ? `${dayHabits.length} habits completed on this day`
                      : 'No habits completed yet on this date'}{' '}
                    •{' '}
                    {dayExpenses.length > 0
                      ? `${dayExpenses.length} transactions recorded`
                      : 'No spending logged'}
                  </p>
                </div>

                {/* Import Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {dayHabits.length > 0 && (
                    <button
                      type="button"
                      onClick={importHabits}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Insert completed habits into your daily note"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Import Habits ({dayHabits.length})</span>
                    </button>
                  )}

                  {dayExpenses.length > 0 && (
                    <button
                      type="button"
                      onClick={importExpenses}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs font-bold text-violet-700 dark:text-violet-300 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Insert expenses into your daily note"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Import Expenses</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Habit Badges Carousel */}
              {dayHabits.length > 0 && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {dayHabits.map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs"
                    >
                      <span>{h.icon}</span>
                      <span>{h.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* The Editor Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-sm space-y-6">
              {/* Title & Headline */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Day Title / Headline
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="Title or summary of your day..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-base sm:text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>

              {/* Mood & Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Mood Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    How was your day?
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 bg-slate-100/70 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
                    {MOODS.map((m) => {
                      const isSelected = mood === m.emoji;
                      return (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => {
                            setMood(m.emoji);
                            markDirty();
                          }}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-150 active:scale-95 ${
                            isSelected
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/40 font-bold scale-105'
                              : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-500'
                          }`}
                          title={m.label}
                        >
                          <span className="text-xl sm:text-2xl leading-none">{m.emoji}</span>
                          <span className="text-[9px] mt-1 font-semibold truncate max-w-full">
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Star Rating */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
                    <span>Productivity / Fulfillment</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold normal-case">
                      {rating === 5 && 'Outstanding'}
                      {rating === 4 && 'Very Productive'}
                      {rating === 3 && 'Good Day'}
                      {rating === 2 && 'Average'}
                      {rating === 1 && 'Low Energy'}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 justify-around">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          markDirty();
                        }}
                        className="transition-transform active:scale-90 p-1"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-all duration-150 ${
                            star <= rating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)] scale-110'
                              : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags / Focus Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Focus Areas &amp; Categories
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomTag(!showAddCustomTag)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Tag</span>
                  </button>
                </div>

                {showAddCustomTag && (
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                      placeholder="Tag name..."
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <button
                      type="button"
                      onClick={addCustomTag}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomTag(false)}
                      className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-1.5">
                  {/* Default Tag options */}
                  {DEFAULT_TAGS.map((t) => {
                    const active = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        #{t}
                      </button>
                    );
                  })}

                  {/* Any custom tags not in default list */}
                  {tags
                    .filter((t) => !DEFAULT_TAGS.includes(t))
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-violet-600 text-white shadow-sm shadow-violet-600/30 flex items-center gap-1 active:scale-95"
                      >
                        <span>#{t}</span>
                        <X className="w-3 h-3 opacity-75" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Key Wins / Highlights Section */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Key Wins of the Day ({highlights.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Press Enter to add</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHighlight();
                      }
                    }}
                    placeholder="Add a key win or accomplishment..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Win</span>
                  </button>
                </div>

                {highlights.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {highlights.map((h, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-xs font-medium text-slate-700 dark:text-slate-200 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0" />
                          <span className="truncate">{h}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHighlight(idx)}
                          className="text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition p-1"
                          title="Remove win"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Journal / What I Did Textarea */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5" />
                    <span>What I did today (Detailed Journal &amp; Notes)</span>
                  </label>

                  {/* Fast Formatting Toolbar */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertSnippet('- ', 'Accomplished item')}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
                      title="Insert Bullet"
                    >
                      <List className="w-3 h-3" />
                      <span>Bullet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('- [x] ', 'Finished task')}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
                      title="Insert Checkbox"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Task</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const time = `${String(now.getHours()).padStart(2, '0')}:${String(
                          now.getMinutes()
                        ).padStart(2, '0')}`;
                        insertSnippet(`[${time}] `, 'Activity');
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
                      title="Insert Current Timestamp"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Time</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('💡 Reflection: ', 'Lesson learned today')}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
                      title="Insert Reflection"
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>Learning</span>
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    markDirty();
                  }}
                  rows={14}
                  placeholder="Write what you accomplished, learned, or experienced today..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 p-4 text-sm font-normal text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition leading-relaxed resize-y font-sans"
                />
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-bold text-rose-600 dark:text-rose-400 transition flex items-center gap-1.5 active:scale-95"
                    title="Delete entry for this day"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono">Ctrl+S</kbd> to save
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-black shadow-lg shadow-indigo-600/30 active:scale-95 transition flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? 'Saving...' : 'Save Today\'s Log'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Past Entries & Feed Browser */}
          <div
            className={`space-y-4 ${
              activeTab === 'history' ? 'block' : 'hidden lg:block'
            } lg:col-span-4`}
          >
            {/* History Filter Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>Past Entries ({filteredLogs.length})</span>
                </h3>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                  {allLogs.length} Total
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past logs..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 pl-9 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tag Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTag('All')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition ${
                    filterTag === 'All'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All
                </button>
                {DEFAULT_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterTag(t)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition ${
                      filterTag === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>

              {/* Entries List Feed */}
              <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 space-y-2">
                    <FileEdit className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
                    <p className="text-xs font-semibold">No journal logs found</p>
                    <p className="text-[11px]">
                      {searchQuery ? 'Try another search query' : 'Start by writing today\'s log above!'}
                    </p>
                  </div>
                ) : (
                  filteredLogs.map((item) => {
                    const isCurrent = item.date === selectedDate;
                    const dateFormatted = new Date(
                      item.date + 'T00:00:00'
                    ).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    });

                    return (
                      <div
                        key={item._id || item.date}
                        onClick={() => {
                          setSelectedDate(item.date);
                          if (window.innerWidth < 1024) {
                            setActiveTab('editor');
                          }
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 ${
                          isCurrent
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/30'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{item.mood || '😊'}</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {dateFormatted}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {item.rating > 0 &&
                              [1, 2, 3, 4, 5].slice(0, item.rating).map((s) => (
                                <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                              ))}
                          </div>
                        </div>

                        {item.title ? (
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                            {item.title}
                          </h4>
                        ) : null}

                        {item.content ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {item.content.replace(/^[#-]\s+/gm, '')}
                          </p>
                        ) : null}

                        {/* Highlights & Tags row */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {item.highlights && item.highlights.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5" />
                              <span>{item.highlights.length} {item.highlights.length === 1 ? 'win' : 'wins'}</span>
                            </span>
                          )}

                          {(item.tags || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
