import { useState, useRef, useEffect } from 'react';

interface Props {
  options: string[];
  selected: string[];
  placeholder?: string;
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ options, selected, placeholder = 'Select...', onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    );
  };

  const label =
    selected.length === 0 ? placeholder :
    selected.length === 1 ? selected[0] :
    `${selected.length} genres`;

  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-all duration-150 ${
          active
            ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
            : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'
        }`}
      >
        <span className="truncate max-w-28">{label}</span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1.5 left-0 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-scale-in">
          {selected.length > 0 && (
            <div className="px-3 pt-2.5 pb-2 border-b border-zinc-100 dark:border-white/5">
              <button
                onClick={() => onChange([])}
                className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto py-1">
            {options.map(option => {
              const checked = selected.includes(option);
              return (
                <li key={option}>
                  <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer">
                    <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                      checked
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-zinc-300 dark:border-white/20 bg-transparent'
                    }`}>
                      {checked && (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(option)}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{option}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
