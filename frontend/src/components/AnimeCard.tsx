import type { Anime } from '../types/anime';
import { STATUS_LABELS, STATUS_COLORS } from '../types/anime';

interface Props {
  anime: Anime;
  onEdit: (anime: Anime) => void;
  onDelete: (id: number) => void;
}

export function AnimeCard({ anime, onEdit, onDelete }: Props) {
  const displayTitle = anime.title;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        {anime.coverImageUrl ? (
          <img
            src={anime.coverImageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl">
            🎬
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[anime.status]}`}>
          {STATUS_LABELS[anime.status]}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm leading-tight">
          {displayTitle}
        </h3>
        {anime.titleEnglish && anime.titleEnglish !== anime.title && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{anime.titleEnglish}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {anime.episodesWatched}
            {anime.totalEpisodes ? `/${anime.totalEpisodes}` : ''} ep
          </span>
          {anime.score && (
            <>
              <span>·</span>
              <span className="text-yellow-500">★ {anime.score}/10</span>
            </>
          )}
        </div>

        {anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {anime.genres.slice(0, 3).map(g => (
              <span key={g} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {g}
              </span>
            ))}
            {anime.genres.length > 3 && (
              <span className="text-xs text-gray-400">+{anime.genres.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={() => onEdit(anime)}
            className="flex-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium py-1.5 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(anime.id)}
            className="flex-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-medium py-1.5 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
