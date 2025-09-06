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
    Object.assign(this, init);
  }
}

export function isValidCloudEvent(evt: unknown): evt is CloudEvent {
  return !!evt && typeof evt.id === "string" && typeof evt.source === "string" && typeof evt.type === "string" && typeof evt.time === "string" && typeof evt.datacontenttype === "string";
}
