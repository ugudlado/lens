interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  itemCount: number;
  filteredCount?: number;
}

export function SearchBar({ value, onChange, placeholder = 'Search...', itemCount, filteredCount }: Props) {
  if (itemCount === 0) return null;

  return (
    <div className="mb-4">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg border border-border rounded pl-9 pr-8 py-2 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/50"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
            title="Clear search"
          >
            &times;
          </button>
        )}
      </div>
      {value && filteredCount !== undefined && (
        <p className="text-xs text-gray-500 mt-1.5">
          Showing {filteredCount} of {itemCount}
        </p>
      )}
    </div>
  );
}
