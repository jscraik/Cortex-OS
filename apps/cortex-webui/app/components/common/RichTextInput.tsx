'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      onChange(newValue);

      // Move cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = selectionStart + 2;
          textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  };

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const newValue = value.substring(0, selectionStart) + text + value.substring(selectionEnd);
    onChange(newValue);

    // Move cursor position after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = selectionStart + text.length;
        textareaRef.current.selectionEnd = selectionStart + text.length;
      }
    }, 0);
  };

  const formatText = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    const wrappedText = `${prefix}${selectedText}${suffix}`;
    const newValue =
      value.substring(0, selectionStart) + wrappedText + value.substring(selectionEnd);
    onChange(newValue);

    // Adjust cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        if (selectedText) {
          textareaRef.current.selectionStart = selectionStart;
          textareaRef.current.selectionEnd = selectionStart + wrappedText.length;
        } else {
          textareaRef.current.selectionStart = selectionStart + prefix.length;
          textareaRef.current.selectionEnd = selectionStart + prefix.length;
        }
      }
    }, 0);
  };

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? 'bg-gray-100' : 'bg-white'
        }`}
        rows={1}
      />

      {isFocused && !disabled && (
        <div className="absolute bottom-full right-0 mb-1 flex bg-white border rounded shadow-sm">
          <button
            type="button"
            onClick={() => formatText('**')}
            className="p-1 text-xs hover:bg-gray-100"
            aria-label="Bold"
          >
            <span className="font-bold">B</span>
          </button>
          <button
            type="button"
            onClick={() => formatText('*')}
            className="p-1 text-xs hover:bg-gray-100"
            aria-label="Italic"
          >
            <span className="italic">I</span>
          </button>
          <button
            type="button"
            onClick={() => formatText('`')}
            className="p-1 text-xs hover:bg-gray-100"
            aria-label="Code"
          >
            <span className="font-mono">C</span>
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('\n- ')}
            className="p-1 text-xs hover:bg-gray-100"
            aria-label="Bullet list"
          >
            <span>•</span>
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('\n1. ')}
            className="p-1 text-xs hover:bg-gray-100"
            aria-label="Numbered list"
          >
            <span>1.</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RichTextInput;
