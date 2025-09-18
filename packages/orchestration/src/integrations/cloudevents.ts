export interface CloudEventInit<T = unknown> {
	id: string;
	source: string;
	type: string;
	subject?: string;
	time: string;
	datacontenttype: string;
	data: T;
}

export class CloudEvent<T = unknown> implements CloudEventInit<T> {
	id: string;
	source: string;
	type: string;
	subject?: string;
	time: string;
	datacontenttype: string;
	data: T;
	constructor(init: CloudEventInit<T>) {
		this.id = init.id;
		this.source = init.source;
		this.type = init.type;
		this.subject = init.subject;
		this.time = init.time;
		this.datacontenttype = init.datacontenttype;
		this.data = init.data;
	}
}

export function isValidCloudEvent(evt: unknown): evt is CloudEvent {
	if (!evt || typeof evt !== 'object') return false;
	const anyEvt = evt as Record<string, unknown>;
	return (
		typeof anyEvt.id === 'string' &&
		typeof anyEvt.source === 'string' &&
		typeof anyEvt.type === 'string' &&
		typeof anyEvt.time === 'string' &&
		typeof anyEvt.datacontenttype === 'string'
	);
}
