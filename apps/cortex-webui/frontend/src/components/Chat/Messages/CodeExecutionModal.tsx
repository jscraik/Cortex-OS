'use client';

import type React from 'react';
import Modal from '../../common/Modal';
import CodeExecution from './CodeExecution';

interface CodeExecutionModalProps {
	isOpen: boolean;
	onClose: () => void;
	code: string;
	language: string;
}

const CodeExecutionModal: React.FC<CodeExecutionModalProps> = ({
	isOpen,
	onClose,
	code,
	language,
}) => {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Code Execution" size="lg">
			<div className="code-execution-modal">
				<CodeExecution
					code={code}
					language={language}
					// ...existing code...
					onResult={() => {}}
					onError={() => {}}
				/>
			</div>
		</Modal>
	);
};

export default CodeExecutionModal;
