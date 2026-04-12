import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ImportModal } from './ImportModal';
import { SettingsModal } from './SettingsModal';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconLibrary() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="currentColor">
      <rect x="1" y="1" width="5.5" height="5.5" rx="0.75" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="0.75" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="0.75" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.75" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="currentColor">
      <rect x="1" y="8" width="3.5" height="6" rx="0.5" />
      <rect x="5.75" y="5" width="3.5" height="9" rx="0.5" />
      <rect x="10.5" y="2" width="3.5" height="12" rx="0.5" />
    </svg>
  );
}

function IconRewatch() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 7.5a5 5 0 1 1-5-5H11" />
      <polyline points="11 1 13 2.5 11 4" />
    </svg>
  );
}

function IconImportExport() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 9 7.5 12.5 11 9" />
      <polyline points="4 6 7.5 2.5 11 6" />
      <line x1="7.5" y1="2.5" x2="7.5" y2="12.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="2" />
      <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.3 3.3l.7.7M11 11l.7.7M3.3 11.7l.7-.7M11 4l.7-.7" />
    </svg>
  );
}

function IconAdd() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="1" width="13" height="13" rx="2" />
      <line x1="7.5" y1="4.5" x2="7.5" y2="10.5" />
      <line x1="4.5" y1="7.5" x2="10.5" y2="7.5" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="5" r="2.5" />
      <path d="M2 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="4.5" r="2" />
      <path d="M1 13c0-2.76 2.02-5 4.5-5s4.5 2.24 4.5 5" />
      <path d="M10.5 7.5c1.38 0 2.5 1.34 2.5 3" strokeOpacity="0.55" />
      <circle cx="10.5" cy="3.5" r="1.5" strokeOpacity="0.55" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
      <polyline points="10 10.5 13 7.5 10 4.5" />
      <line x1="13" y1="7.5" x2="5.5" y2="7.5" />
    </svg>
  );
}

// ── SpeedDial ─────────────────────────────────────────────────────────────────

interface DialItem {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: boolean;
  isDanger?: boolean;
}

export function SpeedDial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleImported = () => {
    window.dispatchEvent(new CustomEvent('zanime:refresh'));
  };

  // Visual order: top → bottom (sign out at top, library at bottom / nearest trigger)
  const items: DialItem[] = [
    {
      icon: <IconSignOut />,
      label: 'Sign out',
      action: logout,
      isDanger: true,
    },
    {
      icon: <IconSettings />,
      label: 'Settings',
      action: () => setShowSettings(true),
    },
    {
      icon: <IconImportExport />,
      label: 'Import / Export',
      action: () => setShowImport(true),
    },
    {
      icon: <IconRewatch />,
      label: 'Recommendations',
      action: () => navigate('/recommendations'),
      isActive: location.pathname === '/recommendations',
    },
    {
      icon: <IconActivity />,
      label: 'Activity',
      action: () => navigate('/activity'),
      isActive: location.pathname === '/activity',
    },
    {
      icon: <IconProfile />,
      label: 'Profile',
      action: () => navigate('/profile'),
      isActive: location.pathname === '/profile',
    },
    ...(user?.role === 'Admin' ? [{
      icon: <IconUsers />,
      label: 'Users',
      action: () => navigate('/users'),
      isActive: location.pathname === '/users',
    }] : []),
    ...(location.pathname === '/' ? [{
      icon: <IconAdd />,
      label: 'Add Anime',
      action: () => window.dispatchEvent(new CustomEvent('zanime:add')),
    }] : []),
    {
      icon: <IconLibrary />,
      label: 'Library',
      action: () => navigate('/'),
      isActive: location.pathname === '/',
    },
  ];

  return (
    <>
      {/*
        Items are always in the layout (never unmounted) so the container always
        occupies the same height — this keeps the trigger pinned and lets the
        invisible items act as the hover catch zone.
      */}
      <div
        className="fixed bottom-6 left-6 z-30 flex flex-col items-start gap-0.5"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {/* Menu items — invisible when closed, slide in from left when open */}
        {items.map((item, i) => (
          <div key={item.label} className="w-full">

            {/* Divider between utility items (sign out / settings / import) and nav */}
            {i === 3 && (
              <div
                className="h-px my-1.5 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(90deg, rgba(34,211,238,0.35), rgba(34,211,238,0.04))',
                  opacity: isOpen ? 1 : 0,
                  transitionDelay: isOpen ? `${(items.length - 1 - 2) * 45 + 15}ms` : '0ms',
                }}
              />
            )}

            <div
              className="transition-all duration-300 ease-out"
              style={{
                opacity: isOpen ? 1 : 0,
                transform: isOpen
                  ? 'translateX(0px) scale(1)'
                  : 'translateX(-10px) scale(0.94)',
                // Open: animate bottom-to-top (Library first, Sign out last)
                // Close: animate top-to-bottom (Sign out first, Library last)
                transitionDelay: isOpen
                  ? `${(items.length - 1 - i) * 45}ms`
                  : `${i * 18}ms`,
                pointerEvents: isOpen ? 'auto' : 'none',
              }}
            >
              <button
                onClick={item.action}
                className={[
                  'relative flex items-center gap-2.5 h-9 pl-3 pr-4',
                  'rounded-lg border text-xs font-semibold tracking-wide',
                  'backdrop-blur-xl transition-all duration-200 whitespace-nowrap select-none',
                  item.isActive
                    ? 'bg-cyan-400/10 border-cyan-400/50 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.3),inset_0_0_14px_rgba(34,211,238,0.04)]'
                    : item.isDanger
                    ? 'bg-black/75 border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:border-red-400/45 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-black/75 border-cyan-500/15 text-cyan-100/45 hover:bg-cyan-500/10 hover:border-cyan-400/40 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(34,211,238,0.18)]',
                ].join(' ')}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                {/* Active dot */}
                {item.isActive && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,1)]" />
                )}
              </button>
            </div>
          </div>
        ))}

        {/* ── Trigger button ─────────────────────────────────────────────────── */}
        <div className="mt-2 self-start">
          <button
            aria-label="Menu"
            className={[
              'relative w-11 h-11 rounded-xl flex items-center justify-center',
              'bg-black/90 border text-cyan-400 backdrop-blur-xl overflow-hidden',
              'transition-all duration-500',
              isOpen
                ? 'border-cyan-400/60 shadow-[0_0_22px_rgba(34,211,238,0.55),0_0_44px_rgba(34,211,238,0.22),inset_0_0_18px_rgba(34,211,238,0.06)]'
                : 'border-cyan-500/35 shadow-[0_0_10px_rgba(34,211,238,0.2),0_0_22px_rgba(34,211,238,0.08)]',
            ].join(' ')}
          >
            {/* Scan-line sweep */}
            <span className="sao-scan-line" />

            {/* Corner bracket accents */}
            <span className="absolute top-1.5 left-1.5 w-2 h-2 border-t-[1.5px] border-l-[1.5px] border-cyan-400/65" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 border-t-[1.5px] border-r-[1.5px] border-cyan-400/65" />
            <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-[1.5px] border-l-[1.5px] border-cyan-400/65" />
            <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-[1.5px] border-r-[1.5px] border-cyan-400/65" />

            {/* Diamond + centre dot icon */}
            <svg
              width="16" height="16" viewBox="0 0 16 16"
              fill="none" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-500 ${isOpen ? 'rotate-[22.5deg] scale-90' : ''}`}
            >
              <path d="M8 1.5L14.5 8L8 14.5L1.5 8Z" />
              <circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
          onOpenSettings={() => { setShowImport(false); setShowSettings(true); }}
        />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
