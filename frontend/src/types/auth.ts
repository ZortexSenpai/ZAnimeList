export type UserRole = 'Admin' | 'User';
export type Theme = 'System' | 'Light' | 'Dark' | 'OLED' | 'Sepia' | 'Midnight' | 'Nord' | 'Dracula' | 'Rose' | 'Mint';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  anilistUsername: string | null;
  malUsername: string | null;
  theme: Theme;
  hasProfilePicture: boolean;
  createdAt: string;
}

export interface TokenResponse {
  token: string;
  user: User;
}
