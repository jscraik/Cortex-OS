'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import InputVariablesModal from './InputVariablesModal';
import VoiceRecording from './VoiceRecording';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
  files?: File[];
  setFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  webSearchEnabled?: boolean;
  setWebSearchEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  imageGenerationEnabled?: boolean;
  setImageGenerationEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  codeInterpreterEnabled?: boolean;
  setCodeInterpreterEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled,
  placeholder = 'Type a message...',
  files = [],
  setFiles = () => {},
  webSearchEnabled = false,
  setWebSearchEnabled = () => {},
  imageGenerationEnabled = false,
  setImageGenerationEnabled = () => {},
  codeInterpreterEnabled = false,
  setCodeInterpreterEnabled = () => {},
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceRecording, setShowVoiceRecording] = useState(false);
  const [showInputVariablesModal, setShowInputVariablesModal] = useState(false);
  const [inputVariables, setInputVariables] = useState<{
    [key: string]: string;
  }>({});
  const [inputVariableValues, setInputVariableValues] = useState<{
    [key: string]: string;
  }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract input variables from text
  const extractInputVariables = (text: string) => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: { [key: string]: string } = {};
    let match: RegExpExecArray | null = variableRegex.exec(text);
    while (match) {
      const variableName = match[1];
      if (!variables[variableName]) {
        variables[variableName] = ''; // Empty description for now
      }
      match = variableRegex.exec(text);
    }

    return variables;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for input variables
    const variables = extractInputVariables(input);
    if (Object.keys(variables).length > 0 && Object.keys(inputVariableValues).length === 0) {
      setInputVariables(variables);
      setShowInputVariablesModal(true);
      return;
    }

    // Replace variables with values
    let finalInput = input;
    Object.keys(inputVariableValues).forEach((key) => {
      finalInput = finalInput.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        inputVariableValues[key],
      );
    });

    if (finalInput.trim() && !disabled) {
      onSendMessage(finalInput.trim());
      setInput('');
      setFiles([]);
      setInputVariableValues({});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }

    // Handle special commands
    // Note: showCommands can toggle a future commands palette
    if (e.key === '/' && input === '') setShowCommands(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      const newFiles = Array.from(e.clipboardData.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const toggleWebSearch = () => {
    setWebSearchEnabled((prev) => !prev);
  };

  const toggleImageGeneration = () => {
    setImageGenerationEnabled((prev) => !prev);
  };

  const toggleCodeInterpreter = () => {
    setCodeInterpreterEnabled((prev) => !prev);
  };

  const handleVoiceRecordingComplete = (_audioBlob: Blob) => {
    // In a real implementation, we would send this audio to a transcription service
    // For now, we'll just add a placeholder message
    setInput('[Audio message recorded]');
    setShowVoiceRecording(false);
    setIsRecording(false);
  };

  const handleVoiceRecordingCancel = () => {
    setShowVoiceRecording(false);
    setIsRecording(false);
  };

  const handleInputVariablesSubmit = (values: { [key: string]: string }) => {
    setInputVariableValues(values);
    setShowInputVariablesModal(false);

    // Submit the message with replaced variables
    let finalInput = input;
    Object.keys(values).forEach((key) => {
      finalInput = finalInput.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), values[key]);
    });

    if (finalInput.trim() && !disabled) {
      onSendMessage(finalInput.trim());
      setInput('');
      setFiles([]);
    }
  };

  const handleInputVariablesCancel = () => {
    setShowInputVariablesModal(false);
  };

  // Handle special text replacements
  useEffect(() => {
    const handleTextReplacements = async () => {
      let newText = input;

      // Handle clipboard variable
      if (input.includes('{{CLIPBOARD}}')) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          newText = newText.replace(/\{\{CLIPBOARD\}\}/g, clipboardText);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Could not read clipboard:', error);
        }
      }

      // Handle current date/time variables
      const now = new Date();
      newText = newText
        .replace(/\{\{DATE\}\}/g, now.toLocaleDateString())
        .replace(/\{\{TIME\}\}/g, now.toLocaleTimeString())
        .replace(/\{\{DATETIME\}\}/g, now.toLocaleString());

      if (newText !== input) {
        setInput(newText);
      }
    };

    // Only process replacements when input changes and doesn't already contain variables
    if (input && !showInputVariablesModal) {
      handleTextReplacements();
    }
  }, [input]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 border-t">
        {/* File attachments */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-1 bg-gray-100 rounded p-1"
              >
                <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remove file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <title>Remove file</title>
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tools bar */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
            aria-label="Attach files"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <title>Attach files</title>
              <path
                fillRule="evenodd"
                d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                clipRule="evenodd"
              />
            </svg>
            <span>Files</span>
          </button>

          <button
            type="button"
            onClick={toggleWebSearch}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 ${
              webSearchEnabled ? 'bg-blue-100 border-blue-500' : ''
            }`}
            aria-label="Web search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <title>Toggle web search</title>
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <span>Web</span>
          </button>

          <button
            type="button"
            onClick={toggleImageGeneration}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 ${
              imageGenerationEnabled ? 'bg-blue-100 border-blue-500' : ''
            }`}
            aria-label="Image generation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <title>Toggle image generation</title>
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={toggleCodeInterpreter}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 ${
              codeInterpreterEnabled ? 'bg-blue-100 border-blue-500' : ''
            }`}
            aria-label="Code interpreter"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <title>Toggle code interpreter</title>
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>Code</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceRecording(true)}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 ${
              isRecording ? 'bg-red-100 border-red-500 animate-pulse' : ''
            }`}
            aria-label="Voice recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <title>Start voice recording</title>
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            <span>Voice</span>
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            className="flex-1 border rounded p-2 resize-none"
            placeholder={placeholder}
            rows={1}
            aria-label="Message composer"
          />
          <button
            type="submit"
            disabled={disabled || (!input.trim() && files.length === 0)}
            className="self-end bg-blue-500 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        {/* Hidden file input paired with the visible "Files" button via aria-controls and label */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
          aria-label="Choose files to attach"
        />
      </form>

      {showVoiceRecording && (
        <VoiceRecording
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleVoiceRecordingCancel}
        />
      )}

      {showInputVariablesModal && (
        <InputVariablesModal
          variables={inputVariables}
          onSubmit={handleInputVariablesSubmit}
          onCancel={handleInputVariablesCancel}
        />
      )}
    </>
  );
};

export default MessageInput;
