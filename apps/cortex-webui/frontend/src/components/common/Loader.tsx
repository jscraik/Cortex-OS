'use client';

import React, { useEffect, useRef } from 'react';

interface LoaderProps {
  onVisible?: () => void;
  children: React.ReactNode;
}

const Loader: React.FC<LoaderProps> = ({ onVisible, children }) => {
  const loaderElementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loaderElementRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              intervalIdRef.current = setInterval(() => {
                if (onVisible) {
                  onVisible();
                }
              }, 100);
            } else {
              if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
              }
            }
          });
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.1,
        }
      );

      observerRef.current.observe(loaderElementRef.current);
    }

    return () => {
      if (observerRef.current && loaderElementRef.current) {
        observerRef.current.unobserve(loaderElementRef.current);
      }

      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [onVisible]);

  return <div ref={loaderElementRef}>{children}</div>;
};

export default Loader;
