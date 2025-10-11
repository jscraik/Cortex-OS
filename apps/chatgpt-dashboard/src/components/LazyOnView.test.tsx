import { describe, it, beforeEach, afterEach, jest, expect } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import * as React from 'react';

import { preloadableLazy } from '../utils/preloadableLazy';
import { LazyOnView } from './LazyOnView';

type ObserverRecord = {
	callback: IntersectionObserverCallback;
	elements: Element[];
	instance: IntersectionObserver;
};

const records: ObserverRecord[] = [];

beforeEach(() => {
	records.length = 0;

	class MockIntersectionObserver implements IntersectionObserver {
		readonly root = null;
		readonly rootMargin = '0px';
		readonly thresholds: ReadonlyArray<number> = [];
		private readonly record: ObserverRecord;

		constructor(callback: IntersectionObserverCallback) {
			this.record = { callback, elements: [], instance: this };
			records.push(this.record);
		}

		observe = (element: Element) => {
			this.record.elements.push(element);
		};

		unobserve = jest.fn();
		disconnect = jest.fn();
		takeRecords = jest.fn(() => []);
	}

	Object.defineProperty(globalThis, 'IntersectionObserver', {
		configurable: true,
		value: MockIntersectionObserver,
	});
});

afterEach(() => {
	(delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver);
});

describe('LazyOnView', () => {
	it('preloads and renders when intersecting', async () => {
		const importer = jest.fn(async () => ({
			default: () => <div data-testid="lazy-loaded">Lazy content</div>,
		}));
		const LazyComp = preloadableLazy(importer);

		render(
			<LazyOnView
				id="lazy-section"
				title="Lazy Section"
				LazyComp={LazyComp}
				componentProps={{}}
				skeleton={<div data-testid="skeleton">Skeleton</div>}
				className="test"
			/>,
		);

	expect(screen.getByTestId('skeleton')).toBeTruthy();

		const { callback, elements, instance } = records[records.length - 1];
		expect(elements.map((el) => el.id)).toContain('lazy-section');

		await act(async () => {
			callback(
				[
					{
						isIntersecting: true,
						intersectionRatio: 1,
						target: elements[0],
						time: 0,
						boundingClientRect: {} as DOMRectReadOnly,
						intersectionRect: {} as DOMRectReadOnly,
						rootBounds: null,
					} as IntersectionObserverEntry,
				],
				instance,
			);
			await Promise.resolve();
		});

	expect(importer).toHaveBeenCalled();
	const loaded = await screen.findByTestId('lazy-loaded');
	expect(loaded).toBeTruthy();
	});
});
