import { describe, it, beforeEach, afterEach, jest, expect } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import * as React from 'react';

import { useScrollSpy } from './useScrollSpy';

type ObserverRecord = {
	callback: IntersectionObserverCallback;
	elements: Element[];
	instance: IntersectionObserver;
};

describe('useScrollSpy', () => {
	const records: ObserverRecord[] = [];

	beforeEach(() => {
		records.length = 0;

		class MockIntersectionObserver implements IntersectionObserver {
			readonly root: Element | Document | null = null;
			readonly rootMargin: string = '0px';
			readonly thresholds: ReadonlyArray<number> = [];
			private readonly record: ObserverRecord;

			constructor(callback: IntersectionObserverCallback) {
				this.record = {
					callback,
					elements: [],
					instance: this,
				};
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

	it('tracks the section becoming visible', () => {
		document.body.innerHTML = `
			<section id="alpha"></section>
			<section id="beta"></section>
		`;

		const ids = ['alpha', 'beta'];

		function SpyComponent() {
			const active = useScrollSpy(ids);
			return <span data-testid="active">{active}</span>;
		}

		render(<SpyComponent />);

		// simulate beta entering the viewport
		const { callback, elements, instance } = records[records.length - 1];
	expect(elements.map((el) => el.id)).toEqual(ids);

		const beta = document.getElementById('beta');
		act(() => {
			callback(
				[
					{
						isIntersecting: true,
						intersectionRatio: 0.9,
						target: beta!,
						time: 0,
						boundingClientRect: beta!.getBoundingClientRect(),
						intersectionRect: beta!.getBoundingClientRect(),
						rootBounds: null,
					} as IntersectionObserverEntry,
				],
				instance,
			);
		});

	expect(screen.getByTestId('active').textContent).toContain('beta');
	});
});
