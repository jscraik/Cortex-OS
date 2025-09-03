'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TextareaProps {
  value?: string;
  placeholder?: string;
  rows?: number;
  minSize?: number | null;
  maxSize?: number | null;
  required?: boolean;
  readonly?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

const Textarea: React.FC<TextareaProps> = ({
  value = '',
  placeholder = '',
  rows = 1,
  minSize = null,
  maxSize = null,
  required = false,
  readonly = false,
  className = 'w-full rounded-lg px-3.5 py-2 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden h-full',
  onChange,
  onBlur,
}) => {
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    resize();

    const interval = setInterval(() => {
      if (textareaRef.current) {
        resize();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [text]);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '';

      let height = textareaRef.current.scrollHeight;
      if (maxSize && height > maxSize) {
        height = maxSize;
      }
      if (minSize && height < minSize) {
        height = minSize;
      }

      textareaRef.current.style.height = `${height}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    if (onChange) {
      onChange(newValue);
    }
    resize();
  };

  const handleFocus = () => {
    resize();
  };

  return (
    <textarea
      ref={textareaRef}
      value={text}
      placeholder={placeholder}
      className={className}
      style={{ fieldSizing: 'content' }}
      rows={rows}
      required={required}
      readOnly={readonly}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={onBlur}
    />
  );
};

export default Textarea;
