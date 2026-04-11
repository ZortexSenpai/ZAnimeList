import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeFilter } from '../components/AnimeFilter';
import { AnimeFormModal } from '../components/AnimeFormModal';
import { ImportModal } from '../components/ImportModal';
import { SettingsModal } from '../components/SettingsModal';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [filters, setFilters] = useState<AnimeFilters>({ sortBy: 'score', sortDesc: true });
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Anime | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
          <span className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">
            ZAnimeList
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/activity')}
              className="hidden sm:inline-flex items-center h-8 px-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150 font-medium"
            >
              Activity
            </button>

            <button
              onClick={() => navigate('/recommendations')}
              className="hidden sm:inline-flex items-center h-8 px-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150 font-medium"
            >
              Rewatch
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150 text-base"
            >
              ⚙
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="hidden sm:inline-flex items-center h-8 px-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150 font-medium"
            >
              Import / Export
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <span className="text-base leading-none">+</span> Add
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                {user?.username}
              </span>
              {user?.role === 'Admin' && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold">
                  admin
                </span>
              )}
            </div>

            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150"
            >
              Sign out
            </button>
          </div>
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
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-indigo-500/20"
              >
                + Add Anime
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-150"
              >
                Import List
              </button>
            </div>
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

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchAnimes(); }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}
