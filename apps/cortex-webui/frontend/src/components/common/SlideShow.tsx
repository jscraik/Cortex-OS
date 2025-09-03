'use client';

import React, { useEffect, useState } from 'react';

interface SlideShowProps {
  imageUrls?: string[];
  duration?: number;
  className?: string;
}

const SlideShow: React.FC<SlideShowProps> = ({
  imageUrls = [
    '/assets/images/adam.jpg',
    '/assets/images/galaxy.jpg',
    '/assets/images/earth.jpg',
    '/assets/images/space.jpg',
  ],
  duration = 5000,
  className = '',
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const baseUrl = process.env.NEXT_PUBLIC_WEBUI_BASE_URL || '';

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedImageIdx((prevIdx) => (prevIdx + 1) % imageUrls.length);
    }, duration);

    return () => clearInterval(interval);
  }, [imageUrls.length, duration]);

  const getImageUrl = (url: string) => {
    return url.startsWith('/') ? `${baseUrl}${url}` : url;
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {imageUrls.map((imageUrl, idx) => (
        <div
          key={idx}
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
          style={{
            opacity: selectedImageIdx === idx ? 1 : 0,
            backgroundImage: `url('${getImageUrl(imageUrl)}')`,
          }}
        />
      ))}

      <style jsx>{`
        .bg-cover {
          background-size: cover;
        }
        .bg-center {
          background-position: center;
        }
        .transition-opacity {
          transition: opacity 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SlideShow;
