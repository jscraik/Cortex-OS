export function useSettingsStore() {
	return {
		general: {
			theme: 'dark',
			language: 'en',
			fontSize: 'base',
			defaultModel: '',
			defaultPrompt: '',
			autoScrollOutput: true,
			enterToSubmit: true,
			doubleEnterToSubmit: false,
			showUsernameInChat: true,
			showModelNameInChat: true,
		},
		notifications: {
			webhook_url: '',
		},
	};
}
