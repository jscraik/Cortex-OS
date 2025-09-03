'use client';

import React, { useEffect, useRef } from 'react';
import AddFilesPlaceholder from '../../AddFilesPlaceholder';

interface FilesOverlayProps {
  show: boolean;
  showSidebar: boolean;
}

const FilesOverlay: React.FC<FilesOverlayProps> = ({ show, showSidebar }) => {
  const overlayElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && overlayElementRef.current) {
      document.body.appendChild(overlayElementRef.current);
      document.body.style.overflow = 'hidden';
    } else if (overlayElementRef.current && overlayElementRef.current.parentNode) {
      document.body.removeChild(overlayElementRef.current);
      document.body.style.overflow = 'unset';
    }

    // Cleanup function
    return () => {
      if (overlayElementRef.current && overlayElementRef.current.parentNode) {
        document.body.removeChild(overlayElementRef.current);
        document.body.style.overflow = 'unset';
      }
    };
  }, [show]);

  if (!show) {
    return null;
  }

  return (
    <div
      ref={overlayElementRef}
      className={`fixed ${
        showSidebar ? 'left-0 md:left-[260px] md:w-[calc(100%-260px)]' : 'left-0'
      } fixed top-0 right-0 bottom-0 w-full h-full flex z-50 touch-none pointer-events-none`}
      id="dropzone"
      role="region"
      aria-label="Drag and Drop Container"
    >
      <div className="absolute w-full h-full backdrop-blur-sm bg-gray-800/40 flex justify-center">
        <div className="m-auto pt-64 flex flex-col justify-center">
          <div className="max-w-md">
            <AddFilesPlaceholder />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesOverlay;
