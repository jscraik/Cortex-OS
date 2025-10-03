export interface CloudEventInit<T = unknown> {
	id: string;
	source: string;
	type: string;
	subject?: string;
	time: string;
	datacontenttype: string;
	data: T;
}
export declare class CloudEvent<T = unknown> implements CloudEventInit<T> {
	id: string;
	source: string;
	type: string;
	subject?: string;
	time: string;
	datacontenttype: string;
	data: T;
	constructor(init: CloudEventInit<T>);
}
export declare function isValidCloudEvent(evt: unknown): evt is CloudEvent;
//# sourceMappingURL=cloudevents.d.ts.map
