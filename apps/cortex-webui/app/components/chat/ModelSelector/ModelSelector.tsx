'use client';

import React from 'react';

interface Model {
  id: string;
  name: string;
  description?: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onModelChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="model-select" className="text-sm font-medium">
        Model:
      </label>
      <select
        id="model-select"
        value={selectedModelId}
        onChange={(e) => onModelChange(e.target.value)}
        className="border rounded p-1 text-sm"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;
