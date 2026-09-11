import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  searchLocation,
  formatPlaceSuggestion,
  parseNominatimBoundingBox,
} from '../../services/mapService';

const RECENTS_KEY = 'crimeMap.recentSearches';
const MAX_RECENTS = 5;

const readRecents = () => {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const pushRecent = (place) => {
  const entry = {
    lat: place.lat,
    lng: place.lng,
    name: place.name,
    primary: place.primary || place.name,
    secondary: place.secondary || '',
    boundingbox: place.boundingbox || null,
  };
  const next = [entry, ...readRecents().filter((r) => r.name !== entry.name)].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
};

/**
 * Google Maps–style place search bar (Nominatim autocomplete).
 */
const LocationSearch = ({
  onLocationSelect,
  onClear,
  onUseCurrentLocation,
  viewbox = null,
  className = '',
  placeholder = 'Search places in Kenya…',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recents, setRecents] = useState(() => readRecents());
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(
    async (term) => {
      try {
        setIsSearching(true);
        const results = await searchLocation(term, { viewbox, limit: 8 });
        setSearchResults(results);
        setShowResults(true);
        setHighlightIndex(-1);
      } catch (error) {
        console.error('Error searching for locations:', error);
        setSearchResults([]);
        setShowResults(true);
      } finally {
        setIsSearching(false);
      }
    },
    [viewbox]
  );

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  const emitPlace = (place) => {
    const nextRecents = pushRecent(place);
    setRecents(nextRecents);
    setSearchTerm(place.primary || place.name);
    setShowResults(false);
    setHighlightIndex(-1);
    onLocationSelect?.(place);
  };

  const handleResultClick = (result) => {
    const { primary, secondary } = formatPlaceSuggestion(result);
    emitPlace({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
      primary,
      secondary,
      boundingbox: parseNominatimBoundingBox(result.boundingbox),
    });
  };

  const handleRecentClick = (recent) => {
    emitPlace({
      ...recent,
      boundingbox: recent.boundingbox || null,
    });
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    setHighlightIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleUseCurrentLocation = () => {
    setSearchTerm('Current location');
    setShowResults(false);
    setHighlightIndex(-1);
    onUseCurrentLocation?.();
  };

  const dropdownItems = (() => {
    if (searchTerm.trim()) {
      return searchResults.map((r) => ({ type: 'result', data: r }));
    }
    return recents.map((r) => ({ type: 'recent', data: r }));
  })();

  const handleKeyDown = (e) => {
    const listLength = dropdownItems.length + (onUseCurrentLocation ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowResults(true);
      setHighlightIndex((i) => (i + 1) % Math.max(listLength, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowResults(true);
      setHighlightIndex((i) => (i <= 0 ? listLength - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setHighlightIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!showResults) {
        if (searchTerm.trim()) performSearch(searchTerm);
        return;
      }

      const currentOffset = onUseCurrentLocation ? 1 : 0;
      if (highlightIndex === 0 && onUseCurrentLocation) {
        handleUseCurrentLocation();
        return;
      }

      const itemIndex = highlightIndex - currentOffset;
      if (itemIndex >= 0 && itemIndex < dropdownItems.length) {
        const item = dropdownItems[itemIndex];
        if (item.type === 'result') handleResultClick(item.data);
        else handleRecentClick(item.data);
      } else if (searchResults.length > 0) {
        handleResultClick(searchResults[0]);
      }
    }
  };

  const showDropdown =
    showResults &&
    (isSearching ||
      searchResults.length > 0 ||
      (!searchTerm.trim() && recents.length > 0) ||
      (searchTerm.trim().length >= 2 && !isSearching));

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative flex items-center bg-white rounded-full shadow-lg border border-gray-200">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          onFocus={() => setShowResults(true)}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          role="combobox"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-[600] mt-2 w-full bg-white shadow-xl rounded-xl py-1 text-sm overflow-hidden border border-gray-100 max-h-80 overflow-y-auto">
          {onUseCurrentLocation && (
            <button
              type="button"
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2 ${
                highlightIndex === 0 ? 'bg-blue-50 text-blue-700' : 'text-blue-600 hover:bg-gray-50'
              }`}
              onClick={handleUseCurrentLocation}
              onMouseEnter={() => setHighlightIndex(0)}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Use current location
            </button>
          )}

          {!searchTerm.trim() && recents.length > 0 && (
            <div className="px-4 pt-2 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Recent
            </div>
          )}

          {isSearching ? (
            <div className="px-4 py-3 text-gray-500">Searching…</div>
          ) : searchTerm.trim() && searchResults.length === 0 ? (
            <div className="px-4 py-3 text-gray-500">No places found</div>
          ) : (
            dropdownItems.map((item, index) => {
              const rowIndex = (onUseCurrentLocation ? 1 : 0) + index;
              const highlighted = highlightIndex === rowIndex;

              if (item.type === 'recent') {
                const recent = item.data;
                return (
                  <button
                    key={`recent-${recent.name}-${index}`}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 ${highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => handleRecentClick(recent)}
                    onMouseEnter={() => setHighlightIndex(rowIndex)}
                  >
                    <div className="font-medium text-gray-900 truncate">{recent.primary || recent.name}</div>
                    {recent.secondary && (
                      <div className="text-xs text-gray-500 truncate">{recent.secondary}</div>
                    )}
                  </button>
                );
              }

              const result = item.data;
              const { primary, secondary } = formatPlaceSuggestion(result);
              return (
                <button
                  key={result.place_id || `${result.lat}-${result.lon}-${index}`}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 ${highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setHighlightIndex(rowIndex)}
                >
                  <div className="font-medium text-gray-900 truncate">{primary}</div>
                  {secondary && <div className="text-xs text-gray-500 truncate">{secondary}</div>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
