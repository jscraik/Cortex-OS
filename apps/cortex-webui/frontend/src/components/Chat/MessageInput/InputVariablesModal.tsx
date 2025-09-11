'use client';

import type React from 'react';
import { useState } from 'react';

interface InputVariablesModalProps {
	variables: { [key: string]: string };
	onSubmit: (values: { [key: string]: string }) => void;
	onCancel: () => void;
}

const InputVariablesModal: React.FC<InputVariablesModalProps> = ({
	variables,
	onSubmit,
	onCancel,
}) => {
	const [values, setValues] = useState<{ [key: string]: string }>(
		Object.keys(variables).reduce(
			(acc, key) => {
				acc[key] = variables[key] || '';
				return acc;
			},
			{} as { [key: string]: string },
		),
	);

	const handleChange = (key: string, value: string) => {
		setValues((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(values);
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
				<h3 className="text-lg font-semibold mb-4">Input Variables</h3>

				<form onSubmit={handleSubmit}>
					<div className="space-y-4">
						{Object.keys(variables).map((key) => (
							<div key={key}>
								<label
									htmlFor={key}
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									{key}
								</label>
								<input
									type="text"
									id={key}
									value={values[key] || ''}
									onChange={(e) => handleChange(key, e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder={variables[key] || `Enter value for ${key}`}
								/>
								{variables[key] && (
									<p className="mt-1 text-sm text-gray-500">{variables[key]}</p>
								)}
							</div>
						))}
					</div>

					<div className="mt-6 flex justify-end space-x-3">
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Submit
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default InputVariablesModal;
