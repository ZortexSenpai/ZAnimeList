import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { OidcCallbackPage } from './pages/OidcCallbackPage';
import { ActivityPage } from './pages/ActivityPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { UsersPage } from './pages/UsersPage';
import { SpeedDial } from './components/SpeedDial';

function applyTheme(theme: string) {
  const isDark =
    theme === 'Dark' || theme === 'OLED' || theme === 'Midnight' || theme === 'Nord' || theme === 'Dracula' ||
    (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('oled', theme === 'OLED');
  document.documentElement.classList.toggle('sepia', theme === 'Sepia');
  document.documentElement.classList.toggle('midnight', theme === 'Midnight');
  document.documentElement.classList.toggle('nord', theme === 'Nord');
  document.documentElement.classList.toggle('dracula', theme === 'Dracula');
  document.documentElement.classList.toggle('rose', theme === 'Rose');
  document.documentElement.classList.toggle('mint', theme === 'Mint');
}

function ThemeApplicator() {
  const { user } = useAuth();
  const theme = user?.theme ?? 'System';

  useEffect(() => {
    applyTheme(theme);
    if (theme === 'System') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('System');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-lg font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent animate-pulse tracking-tight">
          ZAnimeList
        </span>
      </div>
    );
  }

  return user ? <><SpeedDial />{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/oidc-callback" element={<OidcCallbackPage />} />
      <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/users/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeApplicator />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
