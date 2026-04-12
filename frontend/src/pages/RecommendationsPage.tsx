import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRewatchRecommendations } from '../services/api';
import type { RewatchRecommendation } from '../types/recommendation';
import { useAuth } from '../contexts/AuthContext';

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  const years = days / 365;
  return years < 2 ? '1y ago' : `${Math.floor(years)}y ago`;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function RewatchCard({ rec, rank }: { rec: RewatchRecommendation; rank: number }) {
  const title = rec.titleEnglish ?? rec.title;

  return (
    <div className="group relative rounded-xl overflow-hidden bg-zinc-900 shadow-md hover:shadow-2xl hover:shadow-black/40 transition-all duration-500 hover:-translate-y-1 cursor-default animate-fade-up">

      {/* Cover */}
      <div className="aspect-[2/3] overflow-hidden">
        {rec.coverImageUrl ? (
          <img
            src={rec.coverImageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-5xl">
            🎬
          </div>
        )}
      </div>

      {/* Always-on gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

      {/* Rank badge */}
      <div className="absolute top-2 left-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70">
          #{rank}
        </span>
      </div>

      {/* Score badge */}
      <div className="absolute top-2 right-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-amber-400">
          ★ {rec.score}
        </span>
      </div>

      {/* Default bottom info */}
      <div className="absolute inset-x-0 bottom-0 p-3 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1">
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
          {title}
        </h3>
        <p className="text-white/50 text-xs mt-0.5">
          Last seen {formatDaysAgo(rec.daysSinceLastWatch)}
        </p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black via-black/80 to-black/20">
        <div className="p-3 space-y-2">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {title}
          </h3>
          {rec.title !== title && (
            <p className="text-white/40 text-xs leading-tight">{rec.title}</p>
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-white/55 text-xs">
              {rec.totalEpisodes ? `${rec.totalEpisodes} episodes` : `${rec.episodesWatched} ep watched`}
            </p>
            <p className="text-white/55 text-xs">
              Last seen {formatDaysAgo(rec.daysSinceLastWatch)}
            </p>
          </div>
          <div className="pt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400/70 rounded-full"
                  style={{ width: `${Math.min((rec.recommendationScore / 100) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-white/30 shrink-0">match</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecommendationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recs, setRecs] = useState<RewatchRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getRewatchRecommendations()
      .then(setRecs)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">ZAnimeList</Link>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{user?.username}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Description */}
        {!loading && recs.length > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-6">
            Ranked by your rating combined with time since last watch — {recs.length} {recs.length === 1 ? 'title' : 'titles'}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-zinc-500 dark:text-zinc-400">Failed to load recommendations.</p>
          </div>
        ) : recs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 animate-fade-up">
            <div className="text-6xl opacity-30">🔁</div>
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No recommendations yet</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                Rate your completed anime and they'll show up here
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/20"
            >
              Go to Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recs.map((rec, i) => (
              <RewatchCard
                key={rec.userAnimeId}
                rec={rec}
                rank={i + 1}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
