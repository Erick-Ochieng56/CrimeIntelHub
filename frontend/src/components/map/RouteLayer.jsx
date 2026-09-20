import { useEffect } from 'react';
import { Polyline, useMap } from 'react-leaflet';

/**
 * Draw an OSRM route and fit the map to it.
 * @param {{ coordinates: [number, number][], distanceM?: number, durationS?: number } | null} route
 */
const RouteLayer = ({ route }) => {
  const map = useMap();

  useEffect(() => {
    if (!route?.coordinates?.length || !map) return;
    try {
      map.fitBounds(route.coordinates, { padding: [48, 48], maxZoom: 16 });
    } catch {
      /* ignore invalid bounds */
    }
  }, [route, map]);

  if (!route?.coordinates?.length) return null;

  return (
    <Polyline
      positions={route.coordinates}
      pathOptions={{
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }}
    />
  );
};

export default RouteLayer;
