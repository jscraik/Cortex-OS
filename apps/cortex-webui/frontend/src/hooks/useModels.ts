import { useEffect, useState } from 'react';
import { apiFetch } from '../../../utils/api-client';
import notificationStore from '../../utils/notification-store';

interface Model {
  id: string;
  name: string;
}

interface UseModelsReturn {
  models: Model[];
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  loading: boolean;
  error: string | null;
}

export const useModels = (): UseModelsReturn => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch<{
          models: { id: string; label: string }[];
          default?: string;
        }>('/api/models/ui');

        const mapped = (data.models ?? []).map((m) => ({
          id: m.id,
          name: m.label,
        }));

        setModels(mapped);

        if (mapped.length > 0) {
          const initial =
            data.default && mapped.find((m) => m.id === data.default)
              ? data.default
              : mapped[0].id;
          setSelectedModelIds([initial]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load models';
        setError(errorMessage);

        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to fetch models:', err);
        }

        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load models',
        });

        // Fallback to built-in list
        const fallback: Model[] = [
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ];
        setModels(fallback);
        setSelectedModelIds(['gpt-4']);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return {
    models,
    selectedModelIds,
    setSelectedModelIds,
    loading,
    error,
  };
};
