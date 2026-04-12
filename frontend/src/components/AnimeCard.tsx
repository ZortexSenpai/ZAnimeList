import type { CSSProperties } from 'react';
import type { Anime } from '../types/anime';
import { STATUS_LABELS, STATUS_COLORS } from '../types/anime';

interface Props {
  anime: Anime;
  onEdit: (anime: Anime) => void;
  onDelete: (id: number) => void;
  style?: CSSProperties;
}

export function AnimeCard({ anime, onEdit, onDelete, style }: Props) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-zinc-900 shadow-md hover:shadow-2xl hover:shadow-black/40 transition-all duration-500 hover:-translate-y-1 cursor-default animate-fade-up"
      style={style}
    >
      {/* Cover image */}
      <div className="aspect-[2/3] overflow-hidden">
        {anime.coverImageUrl ? (
          <img
            src={anime.coverImageUrl}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-5xl">
            🎬
          </div>
        )}
      </div>

      {/* Persistent bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

      {/* Status badge */}
      <div className="absolute top-2 left-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${STATUS_COLORS[anime.status]}`}>
          {STATUS_LABELS[anime.status]}
        </span>
      </div>

      {/* Score badge */}
      {anime.score != null && (
        <div className="absolute top-2 right-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-amber-400">
            ★ {anime.score}
          </span>
        </div>
      )}

      {/* Bottom info — always visible */}
      <div className="absolute inset-x-0 bottom-0 p-3 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1">
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
          {anime.title}
        </h3>
        <p className="text-white/55 text-xs mt-0.5">
          {anime.episodesWatched}{anime.totalEpisodes ? `/${anime.totalEpisodes}` : ''} ep
        </p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black via-black/80 to-black/20">
        <div className="p-3 space-y-2">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {anime.title}
          </h3>

          {anime.synopsis && (
            <p
              className="text-white/60 text-xs leading-relaxed line-clamp-4"
              dangerouslySetInnerHTML={{ __html: anime.synopsis }}
            />
          )}

          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {anime.genres.slice(0, 3).map(g => (
                <span key={g} className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
              {anime.genres.length > 3 && (
                <span className="text-xs text-white/40">+{anime.genres.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => onEdit(anime)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-150"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(anime.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white/70 hover:text-white transition-colors duration-150"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
