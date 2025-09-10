// Validation utility functions

export const validateEmail = (email: string): boolean => {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
};

export const validatePassword = (
	password: string,
): { isValid: boolean; message: string } => {
	if (password.length < 8) {
		return {
			isValid: false,
			message: 'Password must be at least 8 characters long',
		};
	}

	if (!/[A-Z]/.test(password)) {
		return {
			isValid: false,
			message: 'Password must contain at least one uppercase letter',
		};
	}

	if (!/[a-z]/.test(password)) {
		return {
			isValid: false,
			message: 'Password must contain at least one lowercase letter',
		};
	}

	if (!/\d/.test(password)) {
		return {
			isValid: false,
			message: 'Password must contain at least one number',
		};
	}

	return { isValid: true, message: '' };
};

export const validateFileName = (
	fileName: string,
): { isValid: boolean; message: string } => {
	if (!fileName) {
		return { isValid: false, message: 'File name is required' };
	}

	if (fileName.length > 255) {
		return { isValid: false, message: 'File name is too long' };
	}

	const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
	if (invalidChars.test(fileName)) {
		return { isValid: false, message: 'File name contains invalid characters' };
	}

	return { isValid: true, message: '' };
};

export const validateFileSize = (
	fileSize: number,
	maxSizeMB: number = 10,
): { isValid: boolean; message: string } => {
	const maxSizeBytes = maxSizeMB * 1024 * 1024;

	if (fileSize > maxSizeBytes) {
		return {
			isValid: false,
			message: `File size exceeds ${maxSizeMB}MB limit`,
		};
	}

	return { isValid: true, message: '' };
};
