import React from 'react';
import { COUNT_LEGEND_COLORS } from '../../utils/mapScale';

/**
 * Compact map legend for choropleth / cluster density colour scale.
 */
const MapLegend = ({ mode, maxCount = 0 }) => {
  if (mode === 'points') return null;

  const title =
    mode === 'districts' ? 'Crimes by county' : 'Crimes by area cluster';
  const low = 0;
  const high = maxCount > 0 ? maxCount : '…';

  return (
    <div className="absolute bottom-14 left-3 z-[400] bg-white/95 border border-gray-200 shadow-sm rounded-md px-3 py-2 text-xs text-gray-700 max-w-[200px]">
      <div className="font-semibold text-gray-800 mb-1.5">{title}</div>
      <div
        className="h-2.5 w-full rounded-sm overflow-hidden flex"
        aria-hidden
      >
        {COUNT_LEGEND_COLORS.map((c) => (
          <span key={c} className="flex-1 h-full" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
        <span>{typeof low === 'number' ? low.toLocaleString() : low}</span>
        <span>{typeof high === 'number' ? high.toLocaleString() : high}</span>
      </div>
      {mode === 'districts' && (
        <p className="mt-1.5 text-[10px] text-gray-500 leading-snug">
          County fill = total crimes. Click a county to zoom in.
        </p>
      )}
      {mode === 'clusters' && (
        <p className="mt-1.5 text-[10px] text-gray-500 leading-snug">
          Bubble size & colour = crime density. Click to zoom to markers.
        </p>
      )}
    </div>
  );
};

export default MapLegend;
