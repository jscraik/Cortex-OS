'use client';

import React from 'react';
import Modal from '../../common/Modal';
import CodeExecution from './CodeExecution';

interface CodeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
  result?: string;
  error?: string;
}

const CodeExecutionModal: React.FC<CodeExecutionModalProps> = ({
  isOpen,
  onClose,
  code,
  language,
  result,
  error,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Code Execution" size="lg">
      <div className="code-execution-modal">
        <CodeExecution
          code={code}
          language={language}
          result={result}
          error={error}
          onResult={() => {}}
          onError={() => {}}
        />
      </div>
    </Modal>
  );
};

export default CodeExecutionModal;
