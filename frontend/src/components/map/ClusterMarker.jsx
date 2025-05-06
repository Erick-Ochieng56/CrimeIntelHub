import L from 'leaflet';

// Colors for different crime types - updated to match backend categories
const CRIME_COLORS = {
  'HOMICIDE': '#FF0000',      // Red (matches backend)
  'OFFENSES': '#FF4500',      // Orange-Red (matches backend)
  'ROBBERY': '#FFA500',       // Orange (matches backend)
  'OTHER_OFFENSES': '#FFD700', // Gold (matches backend)
  'BREAKINGS': '#ADFF2F',     // Green-Yellow (matches backend)
  'THEFT_OF_STOLEN_GOODS': '#9ACD32', // Yellow-Green (matches backend)
  'STEALING': '#98FB98',      // Pale Green (matches backend)
  'THEFT_BY_SERVANT': '#90EE90', // Light Green (matches backend)
  'THEFT_OF_VEHICLE': '#00FF7F', // Spring Green (matches backend)
  'DANGEROUS_DRUGS': '#20B2AA', // Light Sea Green (matches backend)
  'TRAFFIC': '#87CEEB',       // Sky Blue (matches backend)
  'ECONOMIC': '#ADD8E6',      // Light Blue (matches backend)
  'CRIMINAL_DAMAGE': '#B0C4DE', // Light Steel Blue (matches backend)
  'CORRUPTION': '#DDA0DD',    // Plum (matches backend)
  'OTHER_PENAL': '#D8BFD8',   // Thistle (matches backend)
  'OTHER': '#718096',        // Gray
};
/**
 * Creates a custom cluster marker icon based on the crimes in the cluster
 * @param {Object} cluster - The cluster object from react-leaflet-markercluster
 * @param {Array} allCrimes - All crimes data for reference
 * @returns {Object} L.divIcon instance
 */
const ClusterMarker = (cluster, allCrimes) => {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;
  
  // Get size based on the number of points
  let size;
  if (count < 10) {
    size = 30;
  } else if (count < 100) {
    size = 40;
  } else {
    size = 50;
  }
  
  
  // Get crime types in this cluster by finding the crime data for each marker
  // This is a simplified approach - in a real app, you'd likely have this data attached to the marker

  // Get crime types in this cluster by finding the crime data for each marker
  // This looks up the crime by matching coordinates closely
  const crimeTypes = markers.map(marker => {
    const [lat, lng] = [marker.getLatLng().lat, marker.getLatLng().lng];
    const crime = allCrimes.find(c => 
      Math.abs(c.latitude - lat) < 0.00001 && 
      Math.abs(c.longitude - lng) < 0.00001
    );
    
    // Make sure we normalize the type to match our color mappings
    const crimeType = crime ? crime.type : 'OTHER';
    return crimeType ? crimeType.toUpperCase() : 'OTHER';
  });
  
  // Count occurrences of each crime type
  const typeCounts = crimeTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  // Find the most common crime type
  let mostCommonType = 'OTHER';
  let maxCount = 0;
  
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      mostCommonType = type;
      maxCount = count;
    }
  });
  
  // Get color for the most common crime type
  const dominantColor = CRIME_COLORS[mostCommonType] || CRIME_COLORS.OTHER;
  
  // Create a pie chart SVG if there are multiple types
  let pieChartSvg = '';
  const uniqueTypes = Object.keys(typeCounts);
  
  if (uniqueTypes.length > 1) {
    let startAngle = 0;
    const paths = uniqueTypes.map(type => {
      const percentage = (typeCounts[type] / count) * 100;
      const endAngle = startAngle + (percentage * 3.6); // 3.6 = 360 / 100
      
      // Calculate SVG arc path
      const x1 = 50 + 40 * Math.cos(Math.PI * startAngle / 180);
      const y1 = 50 + 40 * Math.sin(Math.PI * startAngle / 180);
      const x2 = 50 + 40 * Math.cos(Math.PI * endAngle / 180);
      const y2 = 50 + 40 * Math.sin(Math.PI * endAngle / 180);
      
      // Determine which arc to draw (large or small)
      const largeArcFlag = percentage > 50 ? 1 : 0;
      
      // Create SVG path
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
  
  // Create the cluster icon HTML
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
