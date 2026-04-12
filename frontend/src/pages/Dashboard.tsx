import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeFilter } from '../components/AnimeFilter';
import { AnimeFormModal } from '../components/AnimeFormModal';
import { getAnimes, getGenres, createAnime, updateAnime, deleteAnime } from '../services/api';
import type { Anime, AnimeFilters, CreateAnime } from '../types/anime';
import { useAuth } from '../contexts/AuthContext';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [filters, setFilters] = useState<AnimeFilters>({ sortBy: 'score', sortDesc: true });
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Anime | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAnimes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnimes(filters);
      setAnimes(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAnimes(); }, [fetchAnimes]);

  // Triggered by SpeedDial's ImportModal after a successful import
  useEffect(() => {
    const handler = () => fetchAnimes();
    window.addEventListener('zanime:refresh', handler);
    return () => window.removeEventListener('zanime:refresh', handler);
  }, [fetchAnimes]);

  // Triggered by SpeedDial's Add Anime item
  useEffect(() => {
    const handler = () => setShowAddModal(true);
    window.addEventListener('zanime:add', handler);
    return () => window.removeEventListener('zanime:add', handler);
  }, []);

  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, [animes]);

  const handleSave = async (data: CreateAnime): Promise<void> => {
    if (editTarget) {
      await updateAnime(editTarget.id, data);
      setEditTarget(null);
    } else {
      await createAnime(data);
      setShowAddModal(false);
    }
    fetchAnimes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this anime?')) return;
    await deleteAnime(id);
    fetchAnimes();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">
            ZAnimeList
          </Link>

          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
            {user?.username}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters */}
        <div className="mb-6">
          <AnimeFilter filters={filters} genres={genres} onChange={setFilters} />
        </div>

        {/* Count */}
        {!loading && animes.length > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-4 animate-fade-in">
            {animes.length} {animes.length === 1 ? 'title' : 'titles'}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : animes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 animate-fade-up">
            <div className="text-6xl opacity-30">🎌</div>
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No anime here yet</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Add titles or import your list to get started</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/20"
            >
              + Add Anime
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map((anime, i) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onEdit={setEditTarget}
                onDelete={handleDelete}
                style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {(showAddModal || editTarget) && (
        <AnimeFormModal
          anime={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
        />
      )}

    </div>
  );
}
