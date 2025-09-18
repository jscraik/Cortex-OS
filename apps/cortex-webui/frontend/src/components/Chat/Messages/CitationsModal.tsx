'use client';

import type React from 'react';
import Modal from '../../common/Modal';
import Citations from './Citations';

interface CitationsModalProps {
	isOpen: boolean;
	onClose: () => void;
	citations: any[];
}

const CitationsModal: React.FC<CitationsModalProps> = ({ isOpen, onClose, citations }) => {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Sources" size="lg">
			<div className="citations-modal">
				<Citations citations={citations} />
			</div>
		</Modal>
	);
};

export default CitationsModal;
