export type UserRole = 'Admin' | 'User';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface TokenResponse {
  token: string;
  user: User;
}
