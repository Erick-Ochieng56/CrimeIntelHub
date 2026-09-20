/**
 * Compact directions status panel (origin → destination, distance/duration).
 */
const formatDistance = (meters) => {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  if (seconds == null) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const DirectionsPanel = ({
  open,
  loading,
  error,
  route,
  originLabel,
  destinationLabel,
  onClose,
  onClear,
  onRoute,
  canRoute,
}) => {
  if (!open) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[520] w-[min(92vw,22rem)] bg-white/95 shadow-lg rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Directions</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5"
          aria-label="Close directions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="text-xs text-gray-600 space-y-1 mb-2">
        <div className="flex gap-2">
          <span className="font-medium text-gray-500 w-8 shrink-0">From</span>
          <span className="truncate">{originLabel || 'Your location'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-gray-500 w-8 shrink-0">To</span>
          <span className="truncate">
            {destinationLabel || 'Select a place, crime, or click the map'}
          </span>
        </div>
      </div>

      {loading && <p className="text-xs text-blue-600 mb-2">Calculating route…</p>}
      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}
      {route && !error && (
        <p className="text-xs text-gray-800 mb-2 tabular-nums">
          <span className="font-medium">{formatDistance(route.distanceM)}</span>
          <span className="text-gray-400 mx-1">·</span>
          <span className="font-medium">{formatDuration(route.durationS)}</span>
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRoute}
          disabled={!canRoute || loading}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
        >
          Route
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs py-1.5 px-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none"
        >
          Clear
        </button>
      </div>
      <p className="mt-2 text-[10px] text-gray-400">
        Tip: search a place or click the map for destination. Enable OSRM with{' '}
        <code className="bg-gray-50 px-0.5 rounded">./scripts/download-osrm-kenya.sh</code> then{' '}
        <code className="bg-gray-50 px-0.5 rounded">compose --profile routing</code>.
      </p>
    </div>
  );
};

export default DirectionsPanel;
