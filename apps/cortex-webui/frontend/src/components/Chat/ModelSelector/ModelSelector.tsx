'use client';

import type React from 'react';
import { useState } from 'react';

interface Model {
	id: string;
	name: string;
	description?: string;
}

interface ModelSelectorProps {
	models: Model[];
	selectedModelIds: string[];
	onModelChange: (modelIds: string[]) => void;
	disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
	models,
	selectedModelIds,
	onModelChange,
	disabled = false,
}) => {
	const [pinnedModels, setPinnedModels] = useState<string[]>([]);
	const [showSetDefault, setShowSetDefault] = useState(false);

	const addModel = () => {
		onModelChange([...selectedModelIds, '']);
	};

	const removeModel = (index: number) => {
		const newModelIds = [...selectedModelIds];
		newModelIds.splice(index, 1);
		onModelChange(newModelIds);
	};

	const updateModel = (index: number, modelId: string) => {
		const newModelIds = [...selectedModelIds];
		newModelIds[index] = modelId;
		onModelChange(newModelIds);
	};

	const saveDefaultModel = () => {
		// Store in localStorage or send to backend
		if (typeof window !== 'undefined') {
			localStorage.setItem('defaultModels', JSON.stringify(selectedModelIds));
		}
	};

	const togglePinnedModel = (modelId: string) => {
		setPinnedModels((prev) => {
			if (prev.includes(modelId)) {
				return prev.filter((id) => id !== modelId);
			} else {
				return [...prev, modelId];
			}
		});

		// In a real implementation, this would save to user settings
		if (typeof window !== 'undefined') {
			localStorage.setItem(
				'pinnedModels',
				JSON.stringify(
					pinnedModels.includes(modelId)
						? pinnedModels.filter((id) => id !== modelId)
						: [...pinnedModels, modelId],
				),
			);
		}
	};

	// Separate pinned and unpinned models
	const pinnedModelList = models.filter((model) => pinnedModels.includes(model.id));
	const unpinnedModelList = models.filter((model) => !pinnedModels.includes(model.id));

	return (
		<div className="flex flex-col w-full items-start">
			{selectedModelIds.map((selectedModelId, index) => (
				<div key={`${selectedModelId || 'empty'}-${index}`} className="flex w-full max-w-fit mb-2">
					<div className="overflow-hidden w-full">
						<div className="max-w-full mr-1">
							<div className="relative">
								<select
									id={`model-select-${index}`}
									value={selectedModelId}
									onChange={(e) => updateModel(index, e.target.value)}
									disabled={disabled}
									className="border rounded p-1 text-sm w-full pr-8"
									aria-label={index === 0 ? 'Model' : `Model ${index + 1}`}
								>
									<option value="">Select a model</option>
									{pinnedModelList.length > 0 && (
										<optgroup label="Pinned Models">
											{pinnedModelList.map((model) => (
												<option key={model.id} value={model.id}>
													{model.name}
												</option>
											))}
										</optgroup>
									)}
									{unpinnedModelList.length > 0 && (
										<optgroup label="All Models">
											{unpinnedModelList.map((model) => (
												<option key={model.id} value={model.id}>
													{model.name}
												</option>
											))}
										</optgroup>
									)}
								</select>
								{selectedModelId && (
									<button
										type="button"
										onClick={() => togglePinnedModel(selectedModelId)}
										className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
											pinnedModels.includes(selectedModelId)
												? 'text-yellow-500'
												: 'text-gray-400 hover:text-gray-600'
										}`}
										aria-label={
											pinnedModels.includes(selectedModelId) ? 'Unpin model' : 'Pin model'
										}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M5.5 17.5a.5.5 0 01-1 0V2.914l-.646-.647a.5.5 0 01.708-.708l1.5 1.5a.5.5 0 010 .708l-1.5 1.5a.5.5 0 01-.708-.708L4.5 3.914V17.5zM9 16a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z" />
											<title>
												{pinnedModels.includes(selectedModelId)
													? 'Unpin selected model'
													: 'Pin selected model'}
											</title>
											<path
												fillRule="evenodd"
												d="M2 10a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								)}
							</div>
						</div>
					</div>

					{index === 0 ? (
						<div className="self-center mx-1 flex space-x-1">
							<button
								type="button"
								disabled={disabled}
								onClick={addModel}
								aria-label="Add Model"
								className="disabled:text-gray-600 disabled:hover:text-gray-600 p-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="size-3.5"
								>
									<title>Add model</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => setShowSetDefault(!showSetDefault)}
								aria-label="Set as default"
								className="text-xs text-gray-500 hover:text-gray-700 p-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-3.5 w-3.5"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<title>Set selected models as default</title>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</div>
					) : (
						<div className="self-center mx-1">
							<button
								type="button"
								disabled={disabled}
								onClick={() => removeModel(index)}
								aria-label="Remove Model"
								className="disabled:text-gray-600 disabled:hover:text-gray-600 p-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="size-3"
								>
									<title>Remove model</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
								</svg>
							</button>
						</div>
					)}
				</div>
			))}

			{showSetDefault && (
				<div className="mt-1">
					<button
						type="button"
						onClick={saveDefaultModel}
						className="text-xs text-blue-600 hover:text-blue-800 underline"
					>
						Save as default models
					</button>
				</div>
			)}
		</div>
	);
};

export default ModelSelector;
