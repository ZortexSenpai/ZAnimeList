import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getActivity, getActivityStats } from '../services/api';
import type { WatchActivity, ActivityStats } from '../types/activity';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 150;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  if (status === 'watched episode' || status === 'rewatched episode') return 'text-indigo-400';
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

// ── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

function BarChart({
  values,
  labels,
  height = 'h-14',
  gap = 'gap-px',
}: {
  values: number[];
  labels?: string[];
  height?: string;
  gap?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className={`flex ${gap} ${height}`}>
        {values.map((v, i) => (
          <div key={i} className={`flex-1 flex flex-col items-center ${labels ? 'gap-1.5' : ''}`}>
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full bg-indigo-500/70 dark:bg-indigo-400/60 rounded-sm transition-all duration-300"
                style={{ height: `${v > 0 ? Math.max((v / max) * 100, 5) : 0}%` }}
              />
            </div>
            {labels && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 select-none leading-none">
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats components ─────────────────────────────────────────────────────────

function StatsSection({ stats }: { stats: ActivityStats }) {
  const hourMax = Math.max(...stats.hourDistribution, 1);
  const peakHour = stats.hourDistribution.indexOf(Math.max(...stats.hourDistribution));
  const peakHourLabel = new Date(2000, 0, 1, peakHour)
    .toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

  const peakDay = stats.dayDistribution.indexOf(Math.max(...stats.dayDistribution));

  const monthLabels = stats.monthlyActivity.map(m => MONTHS[m.month - 1]);
  const monthValues = stats.monthlyActivity.map(m => m.count);

  return (
    <div className="space-y-3 mb-8">

      {/* Row 1 — four summary numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        <Card>
          <Label>Episodes</Label>
          <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.totalEpisodesWatched.toLocaleString()}
          </p>
        </Card>

        <Card>
          <Label>Titles</Label>
          <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.uniqueTitles.toLocaleString()}
          </p>
        </Card>

        <Card>
          <Label>Streak</Label>
          <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.currentStreak}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {stats.currentStreak === 1 ? 'day' : 'days'}
          </p>
        </Card>

        <Card>
          <Label>Best streak</Label>
          <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.longestStreak}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {stats.longestStreak === 1 ? 'day' : 'days'}
          </p>
        </Card>

      </div>

      {/* Row 2 — hour + day charts */}
      <div className="grid grid-cols-3 gap-3">

        <Card className="col-span-2">
          <div className="flex items-start justify-between mb-3">
            <Label>Hour of day</Label>
            {hourMax > 1 && (
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold -mt-0.5">
                Peak {peakHourLabel}
              </span>
            )}
          </div>
          <BarChart values={stats.hourDistribution} height="h-16" gap="gap-px" />
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600 mt-1.5 select-none">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-3">
            <Label>Day of week</Label>
            {Math.max(...stats.dayDistribution) > 0 && (
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold -mt-0.5">
                {DAYS[peakDay]}s
              </span>
            )}
          </div>
          <BarChart
            values={stats.dayDistribution}
            labels={DAYS.map(d => d[0])}
            height="h-16"
            gap="gap-1"
          />
        </Card>

      </div>

      {/* Row 3 — monthly trend */}
      <Card>
        <div className="flex items-start justify-between mb-3">
          <Label>Monthly trend</Label>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 -mt-0.5">last 12 months</span>
        </div>
        <BarChart values={monthValues} labels={monthLabels} height="h-20" gap="gap-1.5" />
      </Card>

      {/* Row 4 — top anime */}
      {stats.topAnime.length > 0 && (
        <Card>
          <Label>Most watched</Label>
          <div className="space-y-2.5">
            {stats.topAnime.map((anime, i) => {
              const pct = (anime.count / stats.topAnime[0].count) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-600 w-4 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {anime.title}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500 shrink-0">
                        {anime.count} ep{anime.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500/60 dark:bg-indigo-400/50 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

    </div>
  );
}

function StatsSkeletons() {
  return (
    <div className="space-y-3 mb-8 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-zinc-100 dark:bg-white/5 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 h-36 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
        <div className="h-36 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
      </div>
      <div className="h-36 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
      <div className="h-40 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<WatchActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
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

  useEffect(() => {
    load(1, false);
    getActivityStats().then(setStats).catch(() => {});
  }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  const groups = groupByDate(activities);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">ZAnimeList</Link>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{user?.username}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Stats */}
        {loading ? (
          <StatsSkeletons />
        ) : stats && stats.totalEpisodesWatched > 0 ? (
          <StatsSection stats={stats} />
        ) : null}

        {/* Timeline */}
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
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-150"
                    >
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums w-14 shrink-0 text-right">
                        {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 shrink-0" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-white truncate flex-1 min-w-0">
                        {a.mediaTitle}
                      </span>
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
