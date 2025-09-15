import type React from 'react';
import { useId, useRef, useState } from 'react';
import Modal from '@/components/common/Modal';

interface ImportOptions {
	format: 'json' | 'csv' | 'txt' | 'markdown';
	includeAttachments: boolean;
	overwriteExisting: boolean;
}

interface ImportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onImport: (file: File) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
	isOpen,
	onClose,
	onImport,
}) => {
	const [file, setFile] = useState<File | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [importOptions, setImportOptions] = useState<ImportOptions>({
		format: 'json',
		includeAttachments: true,
		overwriteExisting: false,
	});
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Generate stable unique IDs for accessibility (avoid static ids / collisions)
	const fileInputId = useId();
	const formatSelectId = useId();
	const includeAttachmentsId = useId();
	const overwriteExistingId = useId();
	const uploadHintId = useId();
	const spinnerTitleId = useId();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			setFile(files[0]);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			setFile(files[0]);
		}
	};

	const handleImport = async () => {
		if (!file) return;
		setIsImporting(true);
		try {
			const maybePromise = onImport(file);
			if (typeof maybePromise === 'object' && maybePromise !== null && typeof (maybePromise as Promise<any>).then === 'function') {
				await maybePromise;
			}
			onClose();
			if (
				typeof window !== 'undefined' &&
				'addNotification' in window &&
				typeof (
					window as { addNotification?: (type: string, msg: string) => void }
				).addNotification === 'function'
			) {
				(
					window as { addNotification: (type: string, msg: string) => void }
				).addNotification('success', 'Import completed successfully!');
			}
		} catch (_error) {
			console.debug('[ImportModal] import failed', _error);
			if (
				typeof window !== 'undefined' &&
				'addNotification' in window &&
				typeof (
					window as { addNotification?: (type: string, msg: string) => void }
				).addNotification === 'function'
			) {
				(
					window as { addNotification: (type: string, msg: string) => void }
				).addNotification('error', 'Import failed. Please try again.');
			}
		} finally {
			setIsImporting(false);
		}
	};

	const handleDropAreaKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fileInputRef.current?.click();
		}
	};

	const resetForm = () => {
		setFile(null);
		setImportOptions({
			format: 'json',
			includeAttachments: true,
			overwriteExisting: false,
		});
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Import Data">
			<div className="p-6">
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-white">
							Import Chat Data
						</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Import chats, conversations, or other data from external sources.
						</p>
					</div>

					<div>
						<label
							htmlFor={fileInputId}
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Select File
						</label>

						<button
							type="button"
							className={`w-full mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
								isDragOver
									? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
									: 'border-gray-300 dark:border-gray-600'
							}`}
							aria-describedby={uploadHintId}
							aria-label="File upload dropzone"
							onKeyDown={handleDropAreaKeyDown}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={() => fileInputRef.current?.click()}
						>
							<div className="space-y-1 text-center">
								<svg
									className="mx-auto h-12 w-12 text-gray-400"
									stroke="currentColor"
									fill="none"
									viewBox="0 0 48 48"
									aria-hidden="true"
									focusable="false"
								>
									<path
										d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<div className="flex text-sm text-gray-600 dark:text-gray-400">
									<label
										htmlFor={fileInputId}
										className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
									>
										<span>Upload a file</span>
										<input
											id={fileInputId}
											name="file-upload"
											type="file"
											className="sr-only"
											onChange={handleFileChange}
											ref={fileInputRef}
											accept=".json,.csv,.txt,.md,.markdown"
										/>
									</label>
									<p className="pl-1">or drag and drop</p>
								</div>
								<p
									id={uploadHintId}
									className="text-xs text-gray-500 dark:text-gray-400"
								>
									JSON, CSV, TXT, or Markdown up to 10MB
								</p>
							</div>
						</button>

						{file && (
							<div className="mt-2 flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
								<div className="flex items-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5 text-gray-400"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
										focusable="false"
									>
										<path
											fillRule="evenodd"
											d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
											clipRule="evenodd"
										/>
									</svg>
									<span className="ml-2 text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
										{file.name}
									</span>
								</div>
								<button
									type="button"
									onClick={() => {
										setFile(null);
										if (fileInputRef.current) {
											fileInputRef.current.value = '';
										}
									}}
									className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
										focusable="false"
									>
										<path
											fillRule="evenodd"
											d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							</div>
						)}
					</div>
					{/* end file select block */}

					<div className="mt-6 space-y-5">
						<div>
							<label
								htmlFor={formatSelectId}
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Import Format
							</label>
							<select
								id={formatSelectId}
								value={importOptions.format}
								onChange={(e) =>
									setImportOptions({
										...importOptions,
										format: e.target.value as ImportOptions['format'],
									})
								}
								className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
							>
								<option value="json">JSON</option>
								<option value="csv">CSV</option>
								<option value="txt">Plain Text</option>
								<option value="markdown">Markdown</option>
							</select>
						</div>
						<div className="flex items-center">
							<input
								id={includeAttachmentsId}
								name="include-attachments"
								type="checkbox"
								checked={importOptions.includeAttachments}
								onChange={(e) =>
									setImportOptions({
										...importOptions,
										includeAttachments: e.target.checked,
									})
								}
								className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
							/>
							<label
								htmlFor={includeAttachmentsId}
								className="ml-2 block text-sm text-gray-900 dark:text-white"
							>
								Include attachments
							</label>
						</div>
						<div className="flex items-center">
							<input
								id={overwriteExistingId}
								name="overwrite-existing"
								type="checkbox"
								checked={importOptions.overwriteExisting}
								onChange={(e) =>
									setImportOptions({
										...importOptions,
										overwriteExisting: e.target.checked,
									})
								}
								className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
							/>
							<label
								htmlFor={overwriteExistingId}
								className="ml-2 block text-sm text-gray-900 dark:text-white"
							>
								Overwrite existing data
							</label>
						</div>
					</div>

					<div className="flex justify-end space-x-3">
						<button
							type="button"
							onClick={handleClose}
							className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleImport}
							disabled={!file || isImporting}
							className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
								!file || isImporting
									? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
									: 'bg-blue-600 hover:bg-blue-700'
							}`}
						>
							{isImporting ? (
								<>
									<svg
										className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-labelledby={spinnerTitleId}
									>
										<title id={spinnerTitleId}>Import in progress</title>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Importing...
								</>
							) : (
								'Import'
							)}
						</button>
					</div>
					{/* end actions row */}
				</div>
				{/* end space-y-6 */}
			</div>
			{/* end p-6 */}
		</Modal>
	);
};

export default ImportModal;
