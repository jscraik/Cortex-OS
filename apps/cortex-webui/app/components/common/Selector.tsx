'use client';

import React, { useState } from 'react';

interface SelectorOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectorProps {
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Selector: React.FC<SelectorProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center px-3 py-2 text-sm border rounded-md shadow-sm cursor-pointer ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOption?.icon && <span className="mr-2 flex-shrink-0">{selectedOption.icon}</span>}
        <span className="flex-1 truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
          <ul>
            {options.map((option) => (
              <li
                key={option.value}
                className={`flex items-center px-3 py-2 text-sm cursor-pointer ${
                  value === option.value
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleOptionClick(option.value)}
              >
                {option.icon && <span className="mr-2 flex-shrink-0">{option.icon}</span>}
                <span className="flex-1 truncate">{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Selector;
