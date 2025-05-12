import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';

// Colors for crime types (shared with CrimeMap.jsx)
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
  'UNITS': '#4299e1',
  'VIOLENT': '#4a5568',
  'OTHER': '#718096',
};

const NeighborhoodSummaryMarker = ({ summary }) => {
  const { centroid, total_count, violent_count, neighborhood_name, district_name, categories } = summary;

  if (!centroid || !centroid.coordinates || centroid.coordinates.length < 2) {
    console.warn(`Invalid centroid for ${neighborhood_name}`);
    return null;
  }

  // Calculate marker radius based on total_count (logarithmic scale for better visualization)
  const radius = Math.max(5, Math.log(total_count + 1) * 3);

  // Determine color based on violent crime proportion
  const color = violent_count / total_count > 0.5 ? '#FF0000' : '#1E90FF';

  return (
    <CircleMarker
      center={[centroid.coordinates[1], centroid.coordinates[0]]}
      radius={radius}
      color={color}
      fillOpacity={0.5}
      weight={2}
    >
      <Popup maxWidth={350}>
        <div className="text-sm">
          <h3 className="font-semibold text-gray-900">{neighborhood_name}</h3>
          <p className="text-gray-600">District: {district_name}</p>
          <div className="mt-2">
            <p><strong>Total Crimes:</strong> {total_count}</p>
            <p><strong>Violent Crimes:</strong> {violent_count}</p>
          </div>
          {categories && categories.length > 0 && (
            <div className="mt-2">
              <h4 className="font-medium text-gray-700">Crime Types:</h4>
              <ul className="list-disc ml-5 text-xs">
                {categories
                  .sort((a, b) => b.count - a.count)
                  .map((category) => (
                    <li key={category.name} className="flex items-center">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: category.color || CRIME_COLORS[category.name.toUpperCase()] || '#718096' }}
                      ></span>
                      {category.name}: {category.count}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
};

export default NeighborhoodSummaryMarker;