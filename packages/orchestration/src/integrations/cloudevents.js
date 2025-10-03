export class CloudEvent {
	id;
	source;
	type;
	subject;
	time;
	datacontenttype;
	data;
	constructor(init) {
		this.id = init.id;
		this.source = init.source;
		this.type = init.type;
		this.subject = init.subject;
		this.time = init.time;
		this.datacontenttype = init.datacontenttype;
		this.data = init.data;
	}
}
export function isValidCloudEvent(evt) {
	if (!evt || typeof evt !== 'object') return false;
	const anyEvt = evt;
	return (
		typeof anyEvt.id === 'string' &&
		typeof anyEvt.source === 'string' &&
		typeof anyEvt.type === 'string' &&
		typeof anyEvt.time === 'string' &&
		typeof anyEvt.datacontenttype === 'string'
	);
}
//# sourceMappingURL=cloudevents.js.map
