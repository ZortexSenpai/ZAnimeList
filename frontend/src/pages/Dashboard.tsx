import { useState, useEffect, useCallback } from 'react';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeFilter } from '../components/AnimeFilter';
import { AnimeFormModal } from '../components/AnimeFormModal';
import { ImportModal } from '../components/ImportModal';
import { SettingsModal } from '../components/SettingsModal';
import { getAnimes, getGenres, createAnime, updateAnime, deleteAnime } from '../services/api';
import type { Anime, AnimeFilters, CreateAnime } from '../types/anime';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">ZAnimeList</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ⚙
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Import / Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
            >
              + Add Anime
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user?.username}
              {user?.role === 'Admin' && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  admin
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
          <span><strong className="text-gray-900 dark:text-white">{animes.length}</strong> anime shown</span>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AnimeFilter filters={filters} genres={genres} onChange={setFilters} />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24 text-gray-400">
            <span className="animate-pulse text-lg">Loading...</span>
          </div>
        ) : animes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <span className="text-5xl">🎌</span>
            <p className="text-lg">No anime found. Add some or import your list!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              + Add Anime
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map(anime => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onEdit={setEditTarget}
                onDelete={handleDelete}
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
