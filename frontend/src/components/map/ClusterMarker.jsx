import L from 'leaflet';

// Colors for different crime types
const CRIME_COLORS = {
  'HOMICIDE': '#FF0000',
  'OFFENSES': '#FF4500',
  'ROBBERY': '#FFA500',
  'OTHER_OFFENSES': '#FFD700',
  'BREAKINGS': '#ADFF2F',
  'THEFT_OF_STOLEN_GOODS': '#9ACD32',
  'STEALING': '#98FB98',
  'THEFT_BY_SERVANT': '#90EE90',
  'THEFT_OF_VEHICLE': '#00FF7F',
  'DANGEROUS_DRUGS': '#20B2AA',
  'TRAFFIC': '#87CEEB',
  'ECONOMIC': '#ADD8E6',
  'CRIMINAL_DAMAGE': '#B0C4DE',
  'CORRUPTION': '#DDA0DD',
  'OTHER_PENAL': '#D8BFD8',
  'OTHER': '#718096',
};

const ClusterMarker = (cluster, allCrimes) => {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;

  let size;
  if (count < 10) {
    size = 30;
  } else if (count < 100) {
    size = 40;
  } else {
    size = 50;
  }

  const crimeTypes = markers.map(marker => {
    const [lat, lng] = [marker.getLatLng().lat, marker.getLatLng().lng];
    const crime = allCrimes.find(c =>
      Math.abs(c.latitude - lat) < 0.00001 &&
      Math.abs(c.longitude - lng) < 0.00001
    );
    return crime ? crime.type.toUpperCase() : 'OTHER';
  });

  const typeCounts = crimeTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  let mostCommonType = 'OTHER';
  let maxCount = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      mostCommonType = type;
      maxCount = count;
    }
  });

  const dominantColor = CRIME_COLORS[mostCommonType] || CRIME_COLORS.OTHER;

  let pieChartSvg = '';
  const uniqueTypes = Object.keys(typeCounts);

  if (uniqueTypes.length > 1) {
    let startAngle = 0;
    const paths = uniqueTypes.map(type => {
      const percentage = (typeCounts[type] / count) * 100;
      const endAngle = startAngle + (percentage * 3.6);
      const x1 = 50 + 40 * Math.cos(Math.PI * startAngle / 180);
      const y1 = 50 + 40 * Math.sin(Math.PI * startAngle / 180);
      const x2 = 50 + 40 * Math.cos(Math.PI * endAngle / 180);
      const y2 = 50 + 40 * Math.sin(Math.PI * endAngle / 180);
      const largeArcFlag = percentage > 50 ? 1 : 0;
      const path = `M50,50 L${x1},${y1} A40,40 0 ${largeArcFlag},1 ${x2},${y2} Z`;
      const result = `<path d="${path}" fill="${CRIME_COLORS[type] || CRIME_COLORS.OTHER}" />`;
      startAngle = endAngle;
      return result;
    });

    pieChartSvg = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="${size}px" height="${size}px">
        ${paths.join('')}
        <circle cx="50" cy="50" r="30" fill="white"/>
        <text x="50" y="50" font-family="Arial" font-size="24" fill="#333" text-anchor="middle" dy=".3em">${count}</text>
      </svg>
    `;
  }

  let html;
  if (uniqueTypes.length > 1) {
    html = pieChartSvg;
  } else {
    html = `
      <div style="background-color: ${dominantColor}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 0 0 4px rgba(255,255,255,0.5);">
        ${count}
      </div>
    `;
  }

  return L.divIcon({
    html: html,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2)
  });
};

export default ClusterMarker;