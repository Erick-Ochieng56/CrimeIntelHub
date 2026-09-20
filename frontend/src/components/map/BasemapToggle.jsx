const MODES = [
  { id: 'streets', label: 'Streets' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
];

/**
 * Compact Streets / Satellite / Hybrid switch — matches CrimeMap chrome.
 */
const BasemapToggle = ({ mode, onChange }) => {
  return (
    <div className="absolute bottom-24 left-4 z-[500] flex flex-col gap-1 items-start">
      <div
        className="flex bg-white/95 shadow-md rounded-lg border border-gray-100 overflow-hidden"
        role="group"
        aria-label="Basemap"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-pressed={active}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BasemapToggle;
