import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, GeoJSON, Popup } from 'react-leaflet';
import {
  colorForCount,
  normalizeCountyName,
} from '../../utils/mapScale';

const GEO_URL = '/geo/kenya-counties.geojson';

let cachedGeo = null;
let cachedPromise = null;

const featureCountyName = (feature) => {
  const p = feature?.properties || {};
  return (
    p.name ||
    p.county_name ||
    p.NAME_1 ||
    p.COUNTY_NAM ||
    p.shapeName ||
    p.shapename ||
    null
  );
};

const loadKenyaCounties = () => {
  if (cachedGeo) return Promise.resolve(cachedGeo);
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch(GEO_URL)
    .then(async (r) => {
      if (!r.ok) throw new Error(`Failed to load county boundaries (${r.status})`);
      const ctype = (r.headers.get('content-type') || '').toLowerCase();
      // Vite SPA fallback serves index.html with 200 for missing static files
      if (ctype.includes('text/html')) {
        throw new Error('County boundaries missing (got HTML instead of GeoJSON)');
      }
      const data = await r.json();
      if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        throw new Error('Invalid county GeoJSON');
      }
      if (!data.features.length) {
        throw new Error('County GeoJSON has no features');
      }
      return data;
    })
    .then((data) => {
      cachedGeo = data;
      return data;
    })
    .catch((err) => {
      cachedPromise = null;
      throw err;
    });
  return cachedPromise;
};

/**
 * National zoom: county choropleth joined to viewport district aggregates.
 * Falls back to density circles if boundaries fail to load.
 */
const CountyChoropleth = ({ aggregates = [], onCountyClick }) => {
  const [geo, setGeo] = useState(cachedGeo);
  const [loadError, setLoadError] = useState(null);
  const geoJsonRef = useRef(null);

  const maxCount = useMemo(
    () => Math.max(0, ...aggregates.map((a) => a.count || 0)),
    [aggregates]
  );

  const countByName = useMemo(() => {
    const mapCounts = new Map();
    aggregates.forEach((agg) => {
      const key = normalizeCountyName(agg.name);
      if (!key) return;
      const prev = mapCounts.get(key) || {
        count: 0,
        violent_count: 0,
        lat: agg.lat,
        lng: agg.lng,
        name: agg.name,
      };
      mapCounts.set(key, {
        ...prev,
        count: prev.count + (agg.count || 0),
        violent_count: prev.violent_count + (agg.violent_count || 0),
        lat: agg.lat ?? prev.lat,
        lng: agg.lng ?? prev.lng,
        name: agg.name || prev.name,
      });
    });
    return mapCounts;
  }, [aggregates]);

  useEffect(() => {
    let cancelled = false;
    loadKenyaCounties()
      .then((data) => {
        if (!cancelled) {
          setLoadError(null);
          setGeo(data);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Boundary load failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const styleFeature = (feature) => {
    const key = normalizeCountyName(featureCountyName(feature));
    const stats = countByName.get(key);
    const count = stats?.count || 0;
    return {
      fillColor: count > 0 ? colorForCount(count, maxCount) : '#e5e7eb',
      fillOpacity: count > 0 ? 0.72 : 0.25,
      color: count > 0 ? '#7f1d1d' : '#9ca3af',
      weight: count > 0 ? 1.2 : 0.6,
      opacity: 0.9,
    };
  };

  const onEachFeature = (feature, layer) => {
    const label = featureCountyName(feature) || 'County';
    const key = normalizeCountyName(label);
    const stats = countByName.get(key);
    const count = stats?.count || 0;
    const violent = stats?.violent_count || 0;

    layer.bindTooltip(
      `<div style="font-size:12px;line-height:1.35">
        <strong>${label}</strong><br/>
        ${count.toLocaleString()} crimes
        ${violent ? `<br/><span style="color:#b91c1c">${violent.toLocaleString()} violent</span>` : ''}
        <br/><span style="color:#6b7280;font-size:11px">Click to zoom in</span>
      </div>`,
      { sticky: true, opacity: 0.95 }
    );

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: '#111827', fillOpacity: 0.85 });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      },
      click: () => {
        const bounds = layer.getBounds?.();
        if (bounds?.isValid?.()) {
          onCountyClick?.({
            name: label,
            count,
            violent_count: violent,
            bounds,
            lat: stats?.lat,
            lng: stats?.lng,
          });
          return;
        }
        if (stats?.lat != null && stats?.lng != null) {
          onCountyClick?.({
            name: label,
            count,
            violent_count: violent,
            lat: stats.lat,
            lng: stats.lng,
          });
        }
      },
    });
  };

  // Remount GeoJSON when counts change so styles/tooltips refresh
  const layerKey = useMemo(
    () =>
      `choro-${maxCount}-${aggregates.length}-${[...countByName.entries()]
        .map(([k, v]) => `${k}:${v.count}`)
        .join('|')
        .slice(0, 200)}`,
    [maxCount, aggregates.length, countByName]
  );

  // Still loading boundaries
  if (!geo && !loadError) {
    return null;
  }

  // Fallback: show density circles so national zoom is never blank
  if (loadError || !geo) {
    return (
      <>
        {aggregates.map((agg) => {
          if (agg.lat == null || agg.lng == null) return null;
          const fill = colorForCount(agg.count || 0, maxCount);
          return (
            <Circle
              key={`fallback-${agg.id}`}
              center={[agg.lat, agg.lng]}
              radius={28000 + Math.sqrt(Math.max(agg.count || 1, 1)) * 4500}
              pathOptions={{
                color: '#7f1d1d',
                fillColor: fill,
                fillOpacity: 0.55,
                weight: 1.2,
              }}
              eventHandlers={{
                click: () => onCountyClick?.(agg),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{agg.name || 'County'}</div>
                  <p>{(agg.count || 0).toLocaleString()} crimes</p>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </>
    );
  }

  return (
    <GeoJSON
      key={layerKey}
      data={geo}
      style={styleFeature}
      onEachFeature={onEachFeature}
      ref={geoJsonRef}
    />
  );
};

export default CountyChoropleth;
