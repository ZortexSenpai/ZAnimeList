import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAnimes, getActivityStats, getActivityHeatmap } from '../services/api';
import type { Anime, AnimeStatus } from '../types/anime';
import type { ActivityStats, DailyCount } from '../types/activity';

// ── Status config ─────────────────────────────────────────────────────────────

type StatusMeta = { label: string; bg: string; ring: string };

const STATUS_META: Record<AnimeStatus, StatusMeta> = {
  Completed:   { label: 'Completed',     bg: 'bg-emerald-500', ring: 'ring-emerald-500/40' },
  Watching:    { label: 'Watching',      bg: 'bg-sky-500',     ring: 'ring-sky-500/40' },
  PlanToWatch: { label: 'Plan to Watch', bg: 'bg-violet-500',  ring: 'ring-violet-500/40' },
  OnHold:      { label: 'On Hold',       bg: 'bg-amber-500',   ring: 'ring-amber-500/40' },
  Dropped:     { label: 'Dropped',       bg: 'bg-rose-500',    ring: 'ring-rose-500/40' },
};
const STATUS_ORDER: AnimeStatus[] = ['Completed', 'Watching', 'PlanToWatch', 'OnHold', 'Dropped'];

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
      {children}
    </p>
  );
}

// ── Status segmented bar ──────────────────────────────────────────────────────

function StatusBar({ counts, total }: { counts: Record<AnimeStatus, number>; total: number }) {
  if (total === 0) return null;
  return (
    <Card>
      <SectionLabel>Status breakdown</SectionLabel>
      {/* Segmented bar */}
      <div className="flex rounded-full overflow-hidden h-3 mb-5 gap-px">
        {STATUS_ORDER.map(s => {
          const pct = (counts[s] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              className={`${STATUS_META[s].bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${STATUS_META[s].label}: ${counts[s]}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {STATUS_ORDER.map(s => {
          if (!counts[s]) return null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[s].bg} shrink-0`} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{STATUS_META[s].label}</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">{counts[s]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Score distribution ────────────────────────────────────────────────────────

function ScoreDistCard({ scoreDist }: { scoreDist: number[] }) {
  const max = Math.max(...scoreDist, 1);
  const total = scoreDist.reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionLabel>Score distribution</SectionLabel>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 -mt-0.5">{total} scored</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {scoreDist.map((count, i) => {
          const score = i + 1;
          const heightPct = count > 0 ? Math.max((count / max) * 100, 6) : 0;
          // Colour shifts: low scores red-ish, high scores green-ish
          const barColor =
            score <= 3 ? 'bg-rose-500/60 dark:bg-rose-400/50' :
            score <= 5 ? 'bg-amber-500/60 dark:bg-amber-400/50' :
            score <= 7 ? 'bg-indigo-500/60 dark:bg-indigo-400/50' :
                         'bg-emerald-500/60 dark:bg-emerald-400/50';
          return (
            <div key={score} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end" style={{ height: '72px' }}>
                <div
                  className={`w-full rounded-t-sm ${barColor} transition-all duration-300`}
                  style={{ height: `${heightPct}%` }}
                  title={`Score ${score}: ${count}`}
                />
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 leading-none select-none">
                {score}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Genre breakdown ───────────────────────────────────────────────────────────

function GenreCard({ topGenres }: { topGenres: [string, number][] }) {
  if (topGenres.length === 0) return null;
  const max = topGenres[0][1];
  return (
    <Card>
      <SectionLabel>Top genres</SectionLabel>
      <div className="space-y-2.5">
        {topGenres.map(([genre, count], i) => (
          <div key={genre} className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-600 w-4 shrink-0 text-right">{i + 1}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 w-24 shrink-0 truncate">{genre}</span>
            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500/60 dark:bg-indigo-400/50 rounded-full transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500 w-6 text-right shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Streak + activity summary ─────────────────────────────────────────────────

function ActivitySummaryCard({ stats }: { stats: ActivityStats }) {
  return (
    <Card>
      <SectionLabel>Watching activity</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.totalEpisodesWatched.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">episodes logged</p>
        </div>
        <div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.uniqueTitles.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">titles logged</p>
        </div>
        <div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.currentStreak}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            day{stats.currentStreak !== 1 ? 's' : ''} streak
          </p>
        </div>
        <div>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
            {stats.longestStreak}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            best streak
          </p>
        </div>
      </div>
    </Card>
  );
}

// ── Top rated covers ──────────────────────────────────────────────────────────

function TopRatedSection({ favorites }: { favorites: Anime[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
        Top rated
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {favorites.map(anime => {
          const title = anime.titleEnglish ?? anime.title;
          return (
            <div
              key={anime.id}
              className="group relative rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 aspect-[2/3] cursor-default"
            >
              {anime.coverImageUrl ? (
                <img
                  src={anime.coverImageUrl}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-3xl">
                  🎬
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-x-0 bottom-0 p-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white text-xs font-semibold line-clamp-3 leading-tight drop-shadow">{title}</p>
              </div>
              {/* Score badge — always visible */}
              <div className="absolute top-1.5 right-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-amber-400">
                  ★ {anime.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Watch heatmap ─────────────────────────────────────────────────────────────

const CELL = 11; // px per cell
const GAP  = 3;  // px gap
const STRIDE = CELL + GAP;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function cellColor(count: number): string {
  if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/80';
  if (count <= 2)  return 'bg-cyan-200/80 dark:bg-cyan-900/70';
  if (count <= 5)  return 'bg-cyan-400/80 dark:bg-cyan-700/80';
  if (count <= 10) return 'bg-cyan-500 dark:bg-cyan-500';
  return 'bg-cyan-600 dark:bg-cyan-400';
}

function WatchHeatmap({ data }: { data: DailyCount[] }) {
  const countMap = new Map<string, number>(data.map(d => [d.date, d.count]));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Start from the Sunday on or before (today - 364 days)
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // rewind to Sunday

  // End: Saturday of the week containing today
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - today.getDay()));

  const cells: { date: string; count: number; isFuture: boolean }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    const isFuture = dateStr > todayStr;
    cells.push({ date: dateStr, count: isFuture ? 0 : (countMap.get(dateStr) ?? 0), isFuture });
    cur.setDate(cur.getDate() + 1);
  }

  const numWeeks = Math.ceil(cells.length / 7);

  // Month labels: first week column where a new month begins
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < numWeeks; w++) {
    const d = new Date(cells[w * 7].date);
    const m = d.getMonth();
    if (m !== lastMonth) { monthLabels.push({ weekIdx: w, label: MONTHS[m] }); lastMonth = m; }
  }

  const totalEps = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionLabel>Watch heatmap</SectionLabel>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 -mt-0.5">{totalEps.toLocaleString()} episodes</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ minWidth: `${numWeeks * STRIDE + 28}px` }}>

          {/* Day-of-week labels */}
          <div className="flex flex-col shrink-0" style={{ gap: `${GAP}px`, paddingTop: '18px' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <div
                key={d}
                className="text-[9px] text-zinc-400 dark:text-zinc-600 leading-none select-none flex items-center justify-end pr-1"
                style={{ height: `${CELL}px`, visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid + month labels */}
          <div className="flex-1 min-w-0">
            {/* Month labels */}
            <div className="relative mb-1" style={{ height: '14px' }}>
              {monthLabels.map(({ weekIdx, label }) => (
                <span
                  key={`${label}-${weekIdx}`}
                  className="absolute text-[9px] text-zinc-400 dark:text-zinc-600 leading-none select-none"
                  style={{ left: `${weekIdx * STRIDE}px`, top: 0 }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Cell grid — column-major (Sun→Sat per column, oldest→newest left→right) */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoFlow: 'column',
                gridAutoColumns: `${CELL}px`,
                gap: `${GAP}px`,
              }}
            >
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className={[
                    'rounded-[2px] transition-colors duration-150',
                    cell.isFuture ? 'bg-transparent' : cellColor(cell.count),
                    cell.date === todayStr ? 'ring-1 ring-offset-0 ring-cyan-400 dark:ring-cyan-400' : '',
                  ].join(' ')}
                  title={
                    cell.isFuture
                      ? undefined
                      : `${cell.date}: ${cell.count} episode${cell.count !== 1 ? 's' : ''}`
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mr-0.5">Less</span>
          {[0, 1, 3, 6, 11].map(v => (
            <div key={v} className={`w-[11px] h-[11px] rounded-[2px] ${cellColor(v)}`} />
          ))}
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 ml-0.5">More</span>
        </div>
      </div>
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 animate-pulse">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <span className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">ZAnimeList</span>
        </div>
      </header>
      <div className="h-40 sm:h-52 bg-zinc-200 dark:bg-zinc-800" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-4 -mt-12 mb-6 pb-6 border-b border-zinc-200 dark:border-white/5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-700 shrink-0 ring-4 ring-white dark:ring-zinc-950" />
          <div className="flex flex-col gap-2 pt-8">
            <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-100 dark:bg-white/5 rounded-2xl" />)}
          </div>
          <div className="h-20 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-44 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
            <div className="h-44 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
          </div>
          <div className="h-24 bg-zinc-100 dark:bg-white/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pictureVersion] = useState(Date.now());

  useEffect(() => {
    Promise.all([
      getAnimes(),
      getActivityStats().catch(() => null),
      getActivityHeatmap().catch(() => []),
    ]).then(([a, s, h]) => {
      setAnimes(a);
      setActivityStats(s);
      setHeatmapData(h);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  // ── Computed from library ───────────────────────────────────────────────────
  const totalEntries = animes.length;
  const totalEps = animes.reduce((s, a) => s + a.episodesWatched, 0);
  // 24-minute average episode length
  const daysWatched = (totalEps * 24 / (60 * 24)).toFixed(1);

  const scored = animes.filter(a => a.score != null);
  const meanScore = scored.length
    ? (scored.reduce((s, a) => s + a.score!, 0) / scored.length).toFixed(1)
    : null;

  const statusCounts: Record<AnimeStatus, number> = {
    Completed: 0, Watching: 0, PlanToWatch: 0, OnHold: 0, Dropped: 0,
  };
  animes.forEach(a => statusCounts[a.status]++);

  const scoreDist = Array.from({ length: 10 }, (_, i) =>
    animes.filter(a => a.score === i + 1).length
  );

  const genreMap = new Map<string, number>();
  animes.forEach(a => a.genres.forEach(g => genreMap.set(g, (genreMap.get(g) ?? 0) + 1)));
  const topGenres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][];

  const favorites = animes
    .filter(a => a.score != null)
    .sort((a, b) => b.score! - a.score!)
    .slice(0, 6);

  const hasPicture = user?.hasProfilePicture ?? false;
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">ZAnimeList</Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{user?.username}</span>
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-40 sm:h-52 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 overflow-hidden select-none">
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {/* Glow orbs */}
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-violet-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-1/3 w-56 h-56 bg-indigo-400/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Avatar + identity row ─────────────────────────────────────────── */}
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14 mb-6 pb-6 border-b border-zinc-200 dark:border-white/5">

          {/* Avatar */}
          <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-white dark:ring-zinc-950 overflow-hidden bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-lg">
            {hasPicture ? (
              <img
                src={`/api/auth/profile/picture?t=${pictureVersion}`}
                alt={user?.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 select-none">
                {initials}
              </span>
            )}
          </div>

          {/* Name + links */}
          <div className="sm:pb-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white truncate">
                {user?.username}
              </h1>
              {user?.role === 'Admin' && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                  admin
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.anilistUsername && (
                <a
                  href={`https://anilist.co/user/${encodeURIComponent(user.anilistUsername)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-colors duration-150"
                >
                  AniList
                  <span className="opacity-50 text-[10px]">↗</span>
                </a>
              )}
              {user?.malUsername && (
                <a
                  href={`https://myanimelist.net/profile/${encodeURIComponent(user.malUsername)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors duration-150"
                >
                  MyAnimeList
                  <span className="opacity-50 text-[10px]">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {totalEntries === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-up">
            <div className="text-5xl opacity-30">📋</div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Add anime to your library to see your profile stats
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-10 animate-fade-up">

            {/* ── Quick stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Anime',   value: totalEntries.toLocaleString() },
                { label: 'Episodes',      value: totalEps.toLocaleString() },
                { label: 'Days Watched',  value: daysWatched },
                { label: 'Mean Score',    value: meanScore ?? '—' },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">
                    {value}
                  </p>
                </Card>
              ))}
            </div>

            {/* ── Status breakdown ─────────────────────────────────────────── */}
            <StatusBar counts={statusCounts} total={totalEntries} />

            {/* ── Score dist + Genre breakdown ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ScoreDistCard scoreDist={scoreDist} />
              <GenreCard topGenres={topGenres} />
            </div>

            {/* ── Activity summary ─────────────────────────────────────────── */}
            {activityStats && activityStats.totalEpisodesWatched > 0 && (
              <ActivitySummaryCard stats={activityStats} />
            )}

            {/* ── Watch heatmap ────────────────────────────────────────────── */}
            {heatmapData.length > 0 && (
              <WatchHeatmap data={heatmapData} />
            )}

            {/* ── Top rated covers ─────────────────────────────────────────── */}
            {favorites.length > 0 && (
              <TopRatedSection favorites={favorites} />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
