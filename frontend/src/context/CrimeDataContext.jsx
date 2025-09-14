import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CRIMES: 'SET_CRIMES',
  ADD_CRIMES: 'ADD_CRIMES',
  UPDATE_CRIME: 'UPDATE_CRIME',
  DELETE_CRIME: 'DELETE_CRIME',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_CACHE: 'SET_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
};

// Initial state
const initialState = {
  crimes: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 25,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },
  cache: new Map(),
  lastUpdated: null,
};

// Reducer function
function crimeDataReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error, // Clear error when loading starts
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case ACTIONS.SET_CRIMES:
      return {
        ...state,
        crimes: action.payload.crimes || [],
        pagination: {
          ...state.pagination,
          ...action.payload.pagination,
        },
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null,
      };

    case ACTIONS.ADD_CRIMES:
      return {
        ...state,
        crimes: [...state.crimes, ...action.payload],
        lastUpdated: new Date().toISOString(),
      };

    case ACTIONS.UPDATE_CRIME:
      return {
        ...state,
        crimes: state.crimes.map(crime =>
          crime.id === action.payload.id ? { ...crime, ...action.payload } : crime
        ),
        lastUpdated: new Date().toISOString(),
      };

    case ACTIONS.DELETE_CRIME:
      return {
        ...state,
        crimes: state.crimes.filter(crime => crime.id !== action.payload),
        lastUpdated: new Date().toISOString(),
      };

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 }, // Reset to first page when filters change
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };

    case ACTIONS.SET_CACHE:
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now(),
        ttl: action.payload.ttl || 5 * 60 * 1000, // 5 minutes default
      });
      return {
        ...state,
        cache: newCache,
      };

    case ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        cache: new Map(),
      };

    default:
      return state;
  }
}

// Create context
const CrimeDataContext = createContext();

// Provider component
export function CrimeDataProvider({ children }) {
  const [state, dispatch] = useReducer(crimeDataReducer, initialState);

  // Cache management
  const getCachedData = useCallback((key) => {
    const cached = state.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }, [state.cache]);

  const setCachedData = useCallback((key, data, ttl = 5 * 60 * 1000) => {
    dispatch({
      type: ACTIONS.SET_CACHE,
      payload: { key, data, ttl },
    });
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_CACHE });
  }, []);

  // Request deduplication
  const pendingRequests = useMemo(() => new Map(), []);

  const makeRequest = useCallback(async (requestKey, requestFn) => {
    // Check if request is already pending
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    // Check cache first
    const cachedData = getCachedData(requestKey);
    if (cachedData) {
      return cachedData;
    }

    // Make the request
    const requestPromise = requestFn()
      .then(data => {
        // Cache successful responses
        setCachedData(requestKey, data);
        return data;
      })
      .finally(() => {
        // Remove from pending requests
        pendingRequests.delete(requestKey);
      });

    // Store the pending request
    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }, [getCachedData, setCachedData, pendingRequests]);

  // Crime data actions
  const fetchCrimes = useCallback(async (params = {}) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const requestKey = `crimes_${JSON.stringify(params)}`;
      const data = await makeRequest(requestKey, async () => {
        const response = await fetch(`/api/crimes/?${new URLSearchParams(params)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });

      dispatch({
        type: ACTIONS.SET_CRIMES,
        payload: {
          crimes: data.results || data,
          pagination: data.pagination || {},
        },
      });

      return data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch crimes';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [makeRequest]);

  const fetchCrimeById = useCallback(async (id) => {
    try {
      const requestKey = `crime_${id}`;
      const data = await makeRequest(requestKey, async () => {
        const response = await fetch(`/api/crimes/${id}/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });

      return data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch crime details';
      toast.error(errorMessage);
      throw error;
    }
  }, [makeRequest]);

  const createCrime = useCallback(async (crimeData) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      const response = await fetch('/api/crimes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crimeData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newCrime = await response.json();
      
      dispatch({
        type: ACTIONS.ADD_CRIMES,
        payload: [newCrime],
      });

      toast.success('Crime report created successfully');
      return newCrime;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create crime report';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const updateCrime = useCallback(async (id, crimeData) => {
    try {
      const response = await fetch(`/api/crimes/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crimeData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedCrime = await response.json();
      
      dispatch({
        type: ACTIONS.UPDATE_CRIME,
        payload: updatedCrime,
      });

      // Clear cache for this crime
      setCachedData(`crime_${id}`, updatedCrime);

      toast.success('Crime report updated successfully');
      return updatedCrime;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update crime report';
      toast.error(errorMessage);
      throw error;
    }
  }, [setCachedData]);

  const deleteCrime = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/crimes/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch({
        type: ACTIONS.DELETE_CRIME,
        payload: id,
      });

      // Clear cache for this crime
      setCachedData(`crime_${id}`, null);

      toast.success('Crime report deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete crime report';
      toast.error(errorMessage);
      throw error;
    }
  }, [setCachedData]);

  const setFilters = useCallback((filters) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: {} });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: ACTIONS.SET_PAGINATION, payload: { page } });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // Memoized context value
  const contextValue = useMemo(() => ({
    // State
    ...state,
    
    // Actions
    fetchCrimes,
    fetchCrimeById,
    createCrime,
    updateCrime,
    deleteCrime,
    setFilters,
    clearFilters,
    setPage,
    clearError,
    clearCache,
    
    // Cache utilities
    getCachedData,
    setCachedData,
    
    // Computed values
    hasCrimes: state.crimes.length > 0,
    totalCrimes: state.pagination.total || state.crimes.length,
    isLoading: state.loading,
    hasError: !!state.error,
  }), [
    state,
    fetchCrimes,
    fetchCrimeById,
    createCrime,
    updateCrime,
    deleteCrime,
    setFilters,
    clearFilters,
    setPage,
    clearError,
    clearCache,
    getCachedData,
    setCachedData,
  ]);

  return (
    <CrimeDataContext.Provider value={contextValue}>
      {children}
    </CrimeDataContext.Provider>
  );
}

// Custom hook to use the context
export function useCrimeData() {
  const context = useContext(CrimeDataContext);
  if (!context) {
    throw new Error('useCrimeData must be used within a CrimeDataProvider');
  }
  return context;
}

export default CrimeDataContext;
