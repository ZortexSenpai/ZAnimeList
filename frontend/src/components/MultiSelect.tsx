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
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selected[0]
      : `${selected.length} genres`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-36"
      >
        <span className="flex-1 text-left truncate">
          {selected.length > 0
            ? <span className="text-indigo-600 dark:text-indigo-400">{label}</span>
            : <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {selected.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
              >
                Clear all
              </button>
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.map(option => (
              <li key={option}>
                <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
