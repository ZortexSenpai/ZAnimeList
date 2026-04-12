import axios from 'axios';
import type { Anime, AnimeFilters, CreateAnime, UpdateAnime } from '../types/anime';
import type { TokenResponse, User, UserRole, Theme } from '../types/auth';
import type { WatchActivity } from '../types/activity';

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

export interface OidcConfig { enabled: boolean; displayName: string | null; }
export const getOidcConfig = () =>
  api.get<OidcConfig>('/auth/oidc/config').then(r => r.data);

export const getOidcAuthorizeUrl = (codeChallenge: string, state: string) =>
  api.get<{ url: string }>('/auth/oidc/authorize-url', {
    params: { code_challenge: codeChallenge, state },
  }).then(r => r.data.url);

export const oidcCallback = (code: string, codeVerifier: string) =>
  api.post<TokenResponse>('/auth/oidc/callback', { code, codeVerifier }).then(r => r.data);

export const registerUser = (data: { username: string; password: string; role?: UserRole }) =>
  api.post<User>('/auth/register', data).then(r => r.data);

export const getUsers = () =>
  api.get<User[]>('/auth/users').then(r => r.data);

export const deleteUser = (id: number) =>
  api.delete(`/auth/users/${id}`);

export const updateProfile = (data: { anilistUsername: string | null; malUsername: string | null; theme: Theme }) =>
  api.put<User>('/auth/profile', data).then(r => r.data);

export const uploadProfilePicture = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<User>('/auth/profile/picture', form).then(r => r.data);
};

export const deleteProfilePicture = () =>
  api.delete<User>('/auth/profile/picture').then(r => r.data);

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

export interface ImportProgress {
  processed: number;
  total: number | null;
  current: string | null;
}

async function streamImport(
  url: string,
  init: RequestInit,
  onProgress: (p: ImportProgress) => void,
): Promise<ImportResult> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: ImportResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if ('errors' in data) {
        result = data as ImportResult;
      } else {
        onProgress(data as ImportProgress);
      }
    }
  }

  if (!result) throw new Error('Import ended without a result.');
  return result;
}

export const importMal = (file: File, onProgress: (p: ImportProgress) => void) => {
  const form = new FormData();
  form.append('file', file);
  return streamImport('/api/importexport/mal/import', { method: 'POST', body: form }, onProgress);
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

export const importAnilistByUsername = (username: string, onProgress: (p: ImportProgress) => void) =>
  streamImport(
    `/api/importexport/anilist/import/username?username=${encodeURIComponent(username)}`,
    { method: 'POST' },
    onProgress,
  );

export const importAnilistFile = (file: File, onProgress: (p: ImportProgress) => void) => {
  const form = new FormData();
  form.append('file', file);
  return streamImport('/api/importexport/anilist/import/file', { method: 'POST', body: form }, onProgress);
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

// Activity
export type { WatchActivity };
export const getActivity = (params: { userAnimeId?: number; page?: number; pageSize?: number } = {}) =>
  api.get<WatchActivity[]>('/activity', { params }).then(r => r.data);

export const getActivityStats = () =>
  api.get<import('../types/activity').ActivityStats>('/activity/stats').then(r => r.data);

export const getActivityHeatmap = () =>
  api.get<import('../types/activity').DailyCount[]>('/activity/heatmap').then(r => r.data);

// Recommendations
export const getRewatchRecommendations = () =>
  api.get<import('../types/recommendation').RewatchRecommendation[]>('/recommendations/rewatch').then(r => r.data);
