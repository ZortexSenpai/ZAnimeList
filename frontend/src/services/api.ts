import axios from 'axios';
import type { Anime, AnimeFilters, CreateAnime, UpdateAnime } from '../types/anime';
import type { TokenResponse, User, UserRole } from '../types/auth';

const api = axios.create({
  baseURL: '/api',
  paramsSerializer: params => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach(v => search.append(key, v));
      else search.append(key, String(value));
    }
    return search.toString();
  },
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const loginUser = (data: { username: string; password: string }) =>
  api.post<TokenResponse>('/auth/login', data).then(r => r.data);

export const registerUser = (data: { username: string; password: string; role?: UserRole }) =>
  api.post<User>('/auth/register', data).then(r => r.data);

export const getUsers = () =>
  api.get<User[]>('/auth/users').then(r => r.data);

export const deleteUser = (id: number) =>
  api.delete(`/auth/users/${id}`);

// Anime CRUD
export const getAnimes = (filters: AnimeFilters = {}) =>
  api.get<Anime[]>('/anime', { params: filters }).then(r => r.data);

export const getAnime = (id: number) =>
  api.get<Anime>(`/anime/${id}`).then(r => r.data);

export const createAnime = (data: CreateAnime) =>
  api.post<Anime>('/anime', data).then(r => r.data);

export const updateAnime = (id: number, data: UpdateAnime) =>
  api.put<Anime>(`/anime/${id}`, data).then(r => r.data);

export const deleteAnime = (id: number) =>
  api.delete(`/anime/${id}`);

export const getGenres = () =>
  api.get<string[]>('/anime/genres').then(r => r.data);

// Import / Export
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const importMal = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ImportResult>('/importexport/mal/import', form).then(r => r.data);
};

export const exportMal = () =>
  api.get('/importexport/mal/export', { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animelist.xml';
    a.click();
    URL.revokeObjectURL(url);
  });

export const importAnilistByUsername = (username: string) =>
  api.post<ImportResult>('/importexport/anilist/import/username', null, {
    params: { username },
  }).then(r => r.data);

export const importAnilistFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ImportResult>('/importexport/anilist/import/file', form).then(r => r.data);
};

// AniList search
export interface AnilistSearchResult {
  anilistId: number;
  malId: number | null;
  title: string;
  titleEnglish: string | null;
  synopsis: string | null;
  coverImageUrl: string | null;
  totalEpisodes: number | null;
  genres: string[];
}

export const searchAnilist = (q: string) =>
  api.get<AnilistSearchResult[]>('/anilist/search', { params: { q } }).then(r => r.data);

// Settings
export type ImageSource = 'Local' | 'Anilist' | 'MyAnimeList';

export interface Settings {
  imageSource: ImageSource;
}

export const getSettings = () =>
  api.get<Settings>('/settings').then(r => r.data);

export const updateSettings = (settings: Settings) =>
  api.put<Settings>('/settings', { imageSource: settings.imageSource }).then(r => r.data);
