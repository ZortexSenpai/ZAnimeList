import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRewatchRecommendations, getRecommendableUsers, getUserRecommendations } from '../services/api';
import type { RewatchRecommendation, RecommendableUser, UserBasedRecommendation } from '../types/recommendation';
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

function UserCard({ rec, rank }: { rec: UserBasedRecommendation; rank: number }) {
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
          ★ {rec.recommenderScore}
        </span>
      </div>

      {/* Default bottom info */}
      <div className="absolute inset-x-0 bottom-0 p-3 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1">
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
          {title}
        </h3>
        {rec.totalEpisodes && (
          <p className="text-white/50 text-xs mt-0.5">{rec.totalEpisodes} eps</p>
        )}
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
          {rec.totalEpisodes && (
            <p className="text-white/55 text-xs">{rec.totalEpisodes} episodes</p>
          )}
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-xs font-semibold">★ {rec.recommenderScore}</span>
            <span className="text-white/30 text-xs">/ 10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPicker({
  users,
  selectedId,
  onSelect,
}: {
  users: RecommendableUser[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {users.map(u => {
        const initials = u.username.slice(0, 2).toUpperCase();
        const isSelected = selectedId === u.userId;
        return (
          <button
            key={u.userId}
            onClick={() => onSelect(u.userId)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border shrink-0 transition-all duration-150 ${
              isSelected
                ? 'border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5'
            }`}
          >
            {u.hasProfilePicture ? (
              <img
                src={`/api/auth/users/${u.userId}/picture`}
                alt={u.username}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0 select-none">
                {initials}
              </div>
            )}
            <div className="text-left">
              <div className={`text-sm font-medium leading-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                {u.username}
              </div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                {u.recommendationCount} {u.recommendationCount === 1 ? 'pick' : 'picks'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RewatchTab() {
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

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-zinc-500 dark:text-zinc-400">Failed to load recommendations.</p>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-6">
        Ranked by your rating combined with time since last watch — {recs.length} {recs.length === 1 ? 'title' : 'titles'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {recs.map((rec, i) => (
          <RewatchCard key={rec.userAnimeId} rec={rec} rank={i + 1} />
        ))}
      </div>
    </>
  );
}

function FromOthersTab() {
  const [users, setUsers] = useState<RecommendableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [recs, setRecs] = useState<UserBasedRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    getRecommendableUsers()
      .then(data => {
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0].userId);
      })
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    if (selectedUserId === null) return;
    setRecsLoading(true);
    setRecsError(false);
    setSelectedGenre(null);
    getUserRecommendations(selectedUserId)
      .then(setRecs)
      .catch(() => setRecsError(true))
      .finally(() => setRecsLoading(false));
  }, [selectedUserId]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    recs.forEach(r => r.genres.forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [recs]);

  const filteredRecs = useMemo(
    () => selectedGenre ? recs.filter(r => r.genres.includes(selectedGenre)) : recs,
    [recs, selectedGenre]
  );

  if (usersLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5 animate-fade-up">
        <div className="text-6xl opacity-30">👥</div>
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No other users yet</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Recommendations will appear once other users have rated anime
          </p>
        </div>
      </div>
    );
  }

  const selectedUser = users.find(u => u.userId === selectedUserId);

  return (
    <div className="space-y-6">
      <UserPicker users={users} selectedId={selectedUserId} onSelect={setSelectedUserId} />

      {recsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recsError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-zinc-500 dark:text-zinc-400">Failed to load recommendations.</p>
        </div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 animate-fade-up">
          <div className="text-6xl opacity-30">🎌</div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Nothing new from {selectedUser?.username}</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              You've already watched everything they've rated
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Genre filter pills */}
          {genres.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                  selectedGenre === null
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                All
              </button>
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g === selectedGenre ? null : g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                    selectedGenre === g
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium -mb-2">
            {filteredRecs.length} {filteredRecs.length === 1 ? 'title' : 'titles'}
            {selectedGenre ? ` in ${selectedGenre}` : ''} rated by {selectedUser?.username} that you haven't watched
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredRecs.map((rec, i) => (
              <UserCard key={rec.animeId} rec={rec} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Tab = 'rewatch' | 'from-others';

export function RecommendationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('rewatch');

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

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-zinc-100 dark:bg-white/5 rounded-xl p-1 w-fit">
          {([['rewatch', 'Recommendations'], ['from-others', 'From Others']] as [Tab, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                tab === value
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'rewatch' ? <RewatchTab /> : <FromOthersTab />}
      </main>
    </div>
  );
}
