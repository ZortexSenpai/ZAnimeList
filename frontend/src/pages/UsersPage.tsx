import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, deleteUser, registerUser } from '../services/api';
import type { User } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Avatar({ user }: { user: User }) {
  const initials = user.username.slice(0, 2).toUpperCase();

  if (user.anilistAvatarUrl) {
    return (
      <img
        src={user.anilistAvatarUrl}
        alt={user.username}
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0 select-none">
      {initials}
    </div>
  );
}

function DeleteButton({ userId, onDeleted }: { userId: number; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirming) { setConfirming(true); return; }
    setLoading(true);
    try {
      await deleteUser(userId);
      onDeleted();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleClick}
          disabled={loading}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold transition-all disabled:opacity-50"
        >
          {loading ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all font-medium opacity-0 group-hover:opacity-100"
    >
      Delete
    </button>
  );
}

interface CreateUserForm {
  username: string;
  password: string;
  role: 'User' | 'Admin';
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (user: User) => void }) {
  const [form, setForm] = useState<CreateUserForm>({ username: '', password: '', role: 'User' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const user = await registerUser({ username: form.username.trim(), password: form.password, role: form.role });
      onCreated(user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-200 dark:border-white/10 w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Create user</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus
              required
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as 'User' | 'Admin' }))}
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {error && (
            <p className="text-xs text-rose-500">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.username.trim() || !form.password.trim()}
              className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.anilistUsername?.toLowerCase().includes(q) ||
      u.malUsername?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleDeleted = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleCreated = (user: User) => {
    setUsers(prev => [...prev, user]);
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-black bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight select-none">ZAnimeList</Link>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{me?.username}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <line x1="10" y1="10" x2="13.5" y2="13.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
          {me?.role === 'Admin' && (
            <button
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 shrink-0"
            >
              + New user
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-up">
            <div className="text-5xl opacity-30">👤</div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {search ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Count */}
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-3">
              {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
              {search && users.length !== filtered.length && ` of ${users.length}`}
            </p>

            {filtered.map(u => (
              <div
                key={u.id}
                className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-all duration-150"
              >
                <Link to={`/users/${u.id}`} className="absolute inset-0 rounded-xl" aria-label={`View ${u.username}'s profile`} />
                <Avatar user={u} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {u.username}
                    </span>
                    {u.role === 'Admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                        admin
                      </span>
                    )}
                    {u.id === me?.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                        you
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {u.anilistUsername && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        AL: <span className="text-zinc-600 dark:text-zinc-300">{u.anilistUsername}</span>
                      </span>
                    )}
                    {u.malUsername && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        MAL: <span className="text-zinc-600 dark:text-zinc-300">{u.malUsername}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Member since — hidden on mobile */}
                <span className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
                  {formatMemberSince(u.createdAt)}
                </span>

                {me?.role === 'Admin' && u.id !== me.id && (
                  <div className="relative z-10">
                    <DeleteButton userId={u.id} onDeleted={() => handleDeleted(u.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
