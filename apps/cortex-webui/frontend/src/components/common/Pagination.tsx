'use client';

import React from 'react';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalPages,
	onPageChange,
	className = '',
}) => {
	const getPageNumbers = () => {
		const pages = [];
		const maxVisiblePages = 5;

		if (totalPages <= maxVisiblePages) {
			// Show all pages
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Show first page, current page, and last page with ellipses
			if (currentPage <= 3) {
				// Near the beginning
				for (let i = 1; i <= Math.min(maxVisiblePages - 1, totalPages); i++) {
					pages.push(i);
				}
				if (totalPages > maxVisiblePages) {
					pages.push('ellipsis');
					pages.push(totalPages);
				}
			} else if (currentPage >= totalPages - 2) {
				// Near the end
				pages.push(1);
				pages.push('ellipsis');
				for (let i = totalPages - (maxVisiblePages - 2); i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				// In the middle
				pages.push(1);
				pages.push('ellipsis');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i);
				}
				pages.push('ellipsis');
				pages.push(totalPages);
			}
		}

		return pages;
	};

	const handlePrevious = () => {
		if (currentPage > 1) {
			onPageChange(currentPage - 1);
		}
	};

	const handleNext = () => {
		if (currentPage < totalPages) {
			onPageChange(currentPage + 1);
		}
	};

	const handlePageClick = (page: number | string) => {
		if (typeof page === 'number' && page !== currentPage) {
			onPageChange(page);
		}
	};

	if (totalPages <= 1) return null;

	return (
		<div className={`flex items-center justify-between ${className}`}>
			<div className="text-sm text-gray-700">
				Page {currentPage} of {totalPages}
			</div>

			<div className="flex items-center space-x-1">
				<button
					onClick={handlePrevious}
					disabled={currentPage === 1}
					className={`px-3 py-1 rounded-md text-sm font-medium ${
						currentPage === 1
							? 'text-gray-400 cursor-not-allowed'
							: 'text-gray-700 hover:bg-gray-100'
					}`}
					aria-label="Previous page"
				>
					Previous
				</button>

				{getPageNumbers().map((page, index) => (
					<React.Fragment key={index}>
						{page === 'ellipsis' ? (
							<span className="px-2 py-1 text-gray-500">...</span>
						) : (
							<button
								onClick={() => handlePageClick(page as number)}
								className={`px-3 py-1 rounded-md text-sm font-medium ${
									page === currentPage
										? 'bg-blue-500 text-white'
										: 'text-gray-700 hover:bg-gray-100'
								}`}
								aria-current={page === currentPage ? 'page' : undefined}
							>
								{page}
							</button>
						)}
					</React.Fragment>
				))}

				<button
					onClick={handleNext}
					disabled={currentPage === totalPages}
					className={`px-3 py-1 rounded-md text-sm font-medium ${
						currentPage === totalPages
							? 'text-gray-400 cursor-not-allowed'
							: 'text-gray-700 hover:bg-gray-100'
					}`}
					aria-label="Next page"
				>
					Next
				</button>
			</div>
		</div>
	);
};

export default Pagination;
