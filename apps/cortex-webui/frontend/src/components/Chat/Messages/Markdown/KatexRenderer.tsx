'use client';

import React, { useEffect, useRef } from 'react';

interface KatexRendererProps {
  content: string;
  displayMode?: boolean;
}

const KatexRenderer: React.FC<KatexRendererProps> = ({ content, displayMode = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Dynamically import katex to avoid server-side rendering issues
        import('katex')
          .then((katex) => {
            if (containerRef.current) {
              containerRef.current.innerHTML = katex.default.renderToString(content, {
                displayMode,
                throwOnError: false,
              });
            }
          })
          .catch((error) => {
            console.error('Failed to load katex:', error);
            if (containerRef.current) {
              containerRef.current.innerHTML = content;
            }
          });
      } catch (error) {
        console.error('Error rendering katex:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = content;
        }
      }
    }
  }, [content, displayMode]);

  return <div ref={containerRef} />;
};

export default KatexRenderer;
