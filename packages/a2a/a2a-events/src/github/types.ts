export interface GitHubEventData {
	event_type: string;
	delivery_id: string;
	repository: {
		full_name: string;
		id: number;
		name: string;
		owner: {
			login: string;
			id: number;
		};
	};
	action?: string;
	sender?: {
		login: string;
		id: number;
	};
	// Additional event-specific data
	[key: string]: any;
}
