import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { oidcCallback } from '../services/api';

export function OidcCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const errorParam = params.get('error');
    const errorDesc = params.get('error_description');

    if (errorParam) {
      setError(errorDesc ?? errorParam);
      return;
    }

    if (!code || !returnedState) {
      setError('Missing authorization code or state.');
      return;
    }

    const storedState = sessionStorage.getItem('oidc_state');
    const codeVerifier = sessionStorage.getItem('oidc_code_verifier');
    sessionStorage.removeItem('oidc_state');
    sessionStorage.removeItem('oidc_code_verifier');

    if (returnedState !== storedState) {
      setError('State mismatch — possible CSRF attack. Please try again.');
      return;
    }

    if (!codeVerifier) {
      setError('PKCE code verifier missing. Please try again.');
      return;
    }

    oidcCallback(code, codeVerifier)
      .then(({ token, user }) => {
        login(token, user);
        navigate('/', { replace: true });
      })
      .catch(() => setError('Login failed. The authorization code may have expired.'));
  }, [login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tracking-tight mb-6">
            ZAnimeList
          </h1>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/40">
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5 mb-4">
              {error}
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-150"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <span className="text-lg font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent animate-pulse tracking-tight">
        Signing in…
      </span>
    </div>
  );
}
