'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Adjust tooltip position if it would go off screen
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Reset to preferred position
      setTooltipPosition(position);

      // Adjust if tooltip would go off screen
      if (position === 'top' && tooltipRect.top < 0) {
        setTooltipPosition('bottom');
      } else if (position === 'bottom' && tooltipRect.bottom > viewportHeight) {
        setTooltipPosition('top');
      } else if (position === 'left' && tooltipRect.left < 0) {
        setTooltipPosition('right');
      } else if (position === 'right' && tooltipRect.right > viewportWidth) {
        setTooltipPosition('left');
      }
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm ${getPositionClasses()} transition-opacity duration-200`}
          role="tooltip"
        >
          <div className="relative">
            {content}
            <div
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                tooltipPosition === 'top'
                  ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2'
                  : tooltipPosition === 'bottom'
                    ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2'
                    : tooltipPosition === 'left'
                      ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2'
                      : 'right-full top-1/2 translate-x-1/2 -translate-y-1/2'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
