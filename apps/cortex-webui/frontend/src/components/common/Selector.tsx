'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface SelectorItem {
	value: string;
	label: string;
}

interface SelectorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchEnabled?: boolean;
	searchPlaceholder?: string;
	items: SelectorItem[];
}

const Selector: React.FC<SelectorProps> = ({
	value,
	onChange,
	placeholder = 'Select an option',
	searchEnabled = true,
	searchPlaceholder = 'Search...',
	items = [
		{ value: 'mango', label: 'Mango' },
		{ value: 'watermelon', label: 'Watermelon' },
		{ value: 'apple', label: 'Apple' },
		{ value: 'pineapple', label: 'Pineapple' },
		{ value: 'orange', label: 'Orange' },
	],
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const selectorRef = useRef<HTMLDivElement>(null);

	// Filter items based on search value
	const filteredItems = searchValue
		? items.filter(
				(item) =>
					item.label.toLowerCase().includes(searchValue.toLowerCase()) ||
					item.value.toLowerCase().includes(searchValue.toLowerCase()),
			)
		: items;

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	// Clear search when closing dropdown
	useEffect(() => {
		if (!isOpen) {
			setSearchValue('');
		}
	}, [isOpen]);

	// Find selected item
	const selectedItem = items.find((item) => item.value === value);

	return (
		<div ref={selectorRef} className="relative w-full">
			<button
				type="button"
				className="relative w-full inline-flex h-input px-0.5 items-center justify-between bg-transparent truncate text-lg font-semibold placeholder-gray-400 focus:outline-none"
				aria-label={placeholder}
				onClick={() => setIsOpen(!isOpen)}
			>
				<span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					className={`absolute end-2 top-1/2 -translate-y-[45%] size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
				>
					<path
						fillRule="evenodd"
						d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
						clipRule="evenodd"
					/>
				</svg>
			</button>

			{isOpen && (
				<div
					className="absolute z-50 w-full rounded-lg bg-white dark:bg-gray-900 dark:text-white shadow-lg border border-gray-300/30 dark:border-gray-700/40 outline-none mt-1"
					style={{
						transformOrigin: 'top',
						animation: 'scaleIn 0.2s ease-out',
					}}
				>
					{searchEnabled && (
						<>
							<div className="flex items-center gap-2.5 px-5 mt-3.5 mb-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="size-4"
								>
									<path
										fillRule="evenodd"
										d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
										clipRule="evenodd"
									/>
								</svg>
								<input
									type="text"
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
									className="w-full text-sm bg-transparent outline-none"
									placeholder={searchPlaceholder}
								/>
							</div>
							<hr className="border-gray-100 dark:border-gray-850" />
						</>
					)}

					<div className="px-3 my-2 max-h-80 overflow-y-auto">
						{filteredItems.length > 0 ? (
							filteredItems.map((item) => (
								<button
									key={item.value}
									type="button"
									className="flex w-full font-medium line-clamp-1 select-none items-center rounded-button py-2 pl-3 pr-1.5 text-sm text-gray-700 dark:text-gray-100 outline-hidden transition-all duration-75 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg cursor-pointer data-highlighted:bg-muted"
									onClick={() => {
										onChange(item.value);
										setIsOpen(false);
									}}
								>
									{item.label}
									{value === item.value && (
										<div className="ml-auto">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												className="size-4"
											>
												<path
													fillRule="evenodd"
													d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
									)}
								</button>
							))
						) : (
							<div className="block px-5 py-2 text-sm text-gray-700 dark:text-gray-100">
								No results found
							</div>
						)}
					</div>
				</div>
			)}

			<style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scaleY(0.8);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
		</div>
	);
};

export default Selector;
