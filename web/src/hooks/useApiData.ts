import { useState, useCallback } from 'react';

interface UseApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiDataReturn<T> extends UseApiDataState<T> {
  refetch: () => Promise<void>;
}

export function useApiData<T>(
  fetcher: () => Promise<T>
): UseApiDataReturn<T> {
  const [state, setState] = useState<UseApiDataState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, [fetcher]);

  return {
    ...state,
    refetch,
  };
}