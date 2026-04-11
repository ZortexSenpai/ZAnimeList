import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivity } from '../services/api';
import type { WatchActivity } from '../types/activity';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 150;

function formatAction(activity: WatchActivity): string {
  const { status, progress } = activity;
  if (status === 'watched episode' || status === 'rewatched episode') {
    const verb = status === 'rewatched episode' ? 'Rewatched' : 'Watched';
    if (progress) {
      const isRange = progress.includes(' - ');
      return `${verb} episode${isRange ? 's' : ''} ${progress}`;
    }
    return verb;
  }
  if (status === 'completed') return 'Completed';
  if (status === 'plans to watch') return 'Added to plan';
  if (status === 'paused watching') return 'Paused';
  if (status === 'dropped') return 'Dropped';
  return status;
}

function formatActionColor(status: string): string {
  if (status === 'watched episode' || status === 'rewatched episode')
    return 'text-indigo-400';
  if (status === 'completed') return 'text-emerald-400';
  if (status === 'dropped') return 'text-rose-400';
  if (status === 'paused watching') return 'text-amber-400';
  return 'text-zinc-400';
}

function groupByDate(activities: WatchActivity[]): { label: string; items: WatchActivity[] }[] {
  const groups: Map<string, WatchActivity[]> = new Map();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  for (const a of activities) {
    const d = new Date(a.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let label: string;
    if (dayStart === today) label = 'Today';
    else if (dayStart === yesterday) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function ActivityPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<WatchActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p: number, append: boolean) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const data = await getActivity({ page: p, pageSize: PAGE_SIZE });
      setActivities(prev => append ? [...prev, ...data] : data);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1, false); }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  const groups = groupByDate(activities);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-150 font-medium"
            >
              ← Library
            </button>
            <span className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
            <span className="text-base font-semibold text-zinc-900 dark:text-white">Activity</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{user?.username}</span>
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map(g => (
              <div key={g}>
                <div className="h-4 w-24 bg-zinc-200 dark:bg-white/10 rounded mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-100 dark:bg-white/5 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-up">
            <div className="text-5xl opacity-30">📋</div>
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No activity yet</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Import your AniList to populate your history</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-up">
            {groups.map(group => (
              <section key={group.label}>
                <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {group.items.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-150 group"
                    >
                      {/* Time */}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums w-14 shrink-0 text-right">
                        {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>

                      {/* Dot */}
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 shrink-0" />

                      {/* Title */}
                      <span className="text-sm font-medium text-zinc-900 dark:text-white truncate flex-1 min-w-0">
                        {a.mediaTitle}
                      </span>

                      {/* Action */}
                      <span className={`text-xs font-medium shrink-0 ${formatActionColor(a.status)}`}>
                        {formatAction(a)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
