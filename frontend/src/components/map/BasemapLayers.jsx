import { TileLayer } from 'react-leaflet';

const STREETS = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
};

const SATELLITE = {
  // Esri World Imagery — seamless high-zoom satellite tiles
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  maxZoom: 19,
};

const LABELS = {
  url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19,
  pane: 'overlayPane',
};

/**
 * Basemap tiles. Keep overlays (choropleth, markers) above via Leaflet panes.
 * @param {{ mode: 'streets' | 'satellite' | 'hybrid' }} props
 */
const BasemapLayers = ({ mode = 'streets' }) => {
  if (mode === 'streets') {
    return (
      <TileLayer
        key="streets"
        url={STREETS.url}
        attribution={STREETS.attribution}
        maxZoom={STREETS.maxZoom}
      />
    );
  }

  return (
    <>
      <TileLayer
        key="satellite"
        url={SATELLITE.url}
        attribution={SATELLITE.attribution}
        maxZoom={SATELLITE.maxZoom}
      />
      {mode === 'hybrid' && (
        <TileLayer
          key="labels"
          url={LABELS.url}
          attribution={LABELS.attribution}
          maxZoom={LABELS.maxZoom}
          pane={LABELS.pane}
          zIndex={450}
        />
      )}
    </>
  );
};

export default BasemapLayers;
