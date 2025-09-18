import { randomUUID } from 'node:crypto';
import { nowISO } from './time.js';

export interface CloudEvent<T = unknown> {
	specversion: '1.0';
	id: string;
	source: string;
	type: string;
	time: string;
	datacontenttype?: string;
	data: T;
}

export interface CloudEventInit<T = unknown> {
	source: string;
	type: string;
	data: T;
	id?: string;
	time?: string;
	datacontenttype?: string;
}

export const createCloudEvent = <T>(init: CloudEventInit<T>): CloudEvent<T> => ({
	specversion: '1.0',
	id: init.id ?? randomUUID(),
	source: init.source,
	type: init.type,
	time: init.time ?? nowISO(),
	datacontenttype: init.datacontenttype ?? 'application/json',
	data: init.data,
});
