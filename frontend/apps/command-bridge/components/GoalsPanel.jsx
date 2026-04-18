import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Plus, Trash2, CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

const API = '/api/soma';

const PRIORITY_COLOR = {
  critical: 'text-red-400 border-red-900/40 bg-red-950/20',
  high:     'text-amber-400 border-amber-900/40 bg-amber-950/20',
  medium:   'text-blue-400 border-blue-900/40 bg-blue-950/20',
  low:      'text-zinc-500 border-zinc-800/60 bg-zinc-900/30',
};

const STATUS_ICON = {
  active:    <Clock className="w-3 h-3 text-blue-400" />,
  completed: <CheckCircle className="w-3 h-3 text-emerald-400" />,
  failed:    <AlertCircle className="w-3 h-3 text-red-400" />,
};

function GoalRow({ goal, onDelete, onComplete }) {
  const colorClass = PRIORITY_COLOR[goal.priority] || PRIORITY_COLOR.medium;
  const isActive = !goal.completedAt && !goal.failedAt;

  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-center space-x-3 ${colorClass}`}>
      <div className="shrink-0">{STATUS_ICON[isActive ? 'active' : goal.completedAt ? 'completed' : 'failed']}</div>
      <div className="flex-1 min-w-0">
        <div className="text-zinc-200 text-[11px] font-semibold truncate">{goal.title}</div>
        {goal.description && goal.description !== goal.title && (
          <div className="text-zinc-600 text-[10px] truncate">{goal.description}</div>
        )}
        <div className="flex items-center space-x-2 mt-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">{goal.category || 'general'}</span>
          {goal.progress !== undefined && (
            <div className="flex items-center space-x-1">
              <div className="w-12 bg-zinc-800 rounded-full h-0.5">
                <div className="h-0.5 rounded-full bg-fuchsia-500" style={{ width: `${Math.min(goal.progress || 0, 100)}%` }} />
              </div>
              <span className="text-[9px] text-zinc-600">{goal.progress || 0}%</span>
            </div>
          )}
        </div>
      </div>
      {isActive && (
        <button
          onClick={() => onComplete(goal.id)}
          className="shrink-0 text-emerald-600 hover:text-emerald-400 transition-colors"
          title="Mark complete"
        >
          <CheckCircle className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => onDelete(goal.id)}
        className="shrink-0 text-zinc-700 hover:text-red-400 transition-colors"
        title="Delete goal"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function GoalsPanel({ isConnected }) {
  const [data, setData]       = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ title: '', description: '', category: 'general', priority: 'medium' });
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('active'); // active | all

  const loadInFlight = useRef(false);
  const load = useCallback(() => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    fetch(`${API}/goals`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => { loadInFlight.current = false; });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setForm({ title: '', description: '', category: 'general', priority: 'medium' });
      setShowAdd(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/goals/${id}`, { method: 'DELETE' });
    load();
  };

  const handleComplete = async (id) => {
    await fetch(`${API}/goals/${id}/complete`, { method: 'POST' });
    load();
  };

  const allGoals   = data?.goals || [];
  const activeGoals = allGoals.filter(g => !g.completedAt && !g.failedAt);
  const displayGoals = filter === 'active' ? activeGoals : allGoals;

  const cardClass = 'bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg';

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-100 font-semibold text-sm flex items-center uppercase tracking-wider">
          <Target className="w-4 h-4 mr-2 text-fuchsia-400" />
          Goals
          {activeGoals.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-400 text-[9px] font-bold">{activeGoals.length}</span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter(f => f === 'active' ? 'all' : 'active')}
            className="text-[9px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {filter === 'active' ? 'Show all' : 'Active only'}
          </button>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 text-[10px] font-bold transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 bg-zinc-900/60 rounded-xl p-4 border border-white/5 space-y-3">
          <input
            type="text"
            placeholder="Goal title..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50"
          />
          <div className="flex items-center space-x-3">
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="flex-1 bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-2 text-zinc-400 text-xs focus:outline-none"
            >
              <option value="general">General</option>
              <option value="research">Research</option>
              <option value="engineering">Engineering</option>
              <option value="self_improvement">Self-Improvement</option>
              <option value="user_requested">User Requested</option>
            </select>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="flex-1 bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-2 text-zinc-400 text-xs focus:outline-none"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
            >
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Goal list */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
        {displayGoals.length === 0 ? (
          <div className="text-center py-6 text-zinc-700">
            <Target className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">{filter === 'active' ? 'No active goals.' : 'No goals yet.'}</p>
            <p className="text-[10px] mt-1 opacity-60">SOMA generates goals autonomously, or add one above.</p>
          </div>
        ) : (
          displayGoals.slice(0, 20).map(g => (
            <GoalRow key={g.id} goal={g} onDelete={handleDelete} onComplete={handleComplete} />
          ))
        )}
      </div>

      {displayGoals.length > 20 && (
        <div className="text-center mt-2 text-[10px] text-zinc-700">
          +{displayGoals.length - 20} more goals
        </div>
      )}
    </div>
  );
}
