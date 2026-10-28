import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Targets from './pages/Targets';
import Expenditure from './pages/Expenditure';
import Detail from './pages/Detail';
import MobileNav from './components/MobileNav';
import { api } from './lib/api';

export default function App() {
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'targets' | 'expenditure'
  const [selected, setSelected] = useState(null);
  const [activeTargetsCount, setActiveTargetsCount] = useState(0);

  useEffect(() => {
    // Optionally fetch active goals count for badge
    Promise.all([api('/goals'), api('/activities')])
      .then(([goals, acts]) => {
        const goalsCount = (goals || []).filter((g) => !g.completed).length;
        const specCount = (acts || []).filter(
          (a) => (a.frequency === 'specific' || a.frequency === 'challenge') && !a.completed
        ).length;
        setActiveTargetsCount(goalsCount + specCount);
      })
      .catch(() => {});
  }, [page]);

  const remove = async (activity) => {
    try {
      await api(`/activities/${activity._id}`, 'DELETE');
      setSelected(null);
    } catch (err) {
      console.error('Failed to delete activity', err);
    }
  };

  if (selected) {
    return (
      <Detail
        activity={selected}
        onBack={() => setSelected(null)}
        onDelete={remove}
      />
    );
  }

  return (
    <div className="relative min-h-screen">
      {page === 'targets' && (
        <Targets
          onNavigate={(p) => setPage(p)}
          onSelectActivity={(a) => setSelected(a)}
        />
      )}
      {page === 'expenditure' && (
        <Expenditure
          onNavigate={(p) => setPage(p)}
        />
      )}
      {page === 'dashboard' && (
        <Dashboard
          onNavigate={(p) => setPage(p)}
          onSelectActivity={(a) => setSelected(a)}
        />
      )}

      {/* Modern iOS Bottom Navigation Bar: Habits, Targets, Expenditure */}
      <MobileNav
        currentPage={page}
        onNavigate={(p) => setPage(p)}
        targetsCount={activeTargetsCount}
      />
    </div>
  );
}
