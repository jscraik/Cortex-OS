import type { KeyboardNavigationManager } from '../keyboard-nav.js';

export function handleTab(
	event: KeyboardEvent,
	manager: KeyboardNavigationManager,
): boolean {
	if (event.key !== 'Tab' || event.ctrlKey || event.altKey) {
		return false;
	}
	return manager.moveFocus(event.shiftKey ? 'previous' : 'next');
}

export function handleArrow(
	event: KeyboardEvent,
	manager: KeyboardNavigationManager,
): boolean {
	if (
		event.key !== 'ArrowUp' &&
		event.key !== 'ArrowDown' &&
		event.key !== 'ArrowLeft' &&
		event.key !== 'ArrowRight'
	) {
		return false;
	}
	return manager.handleArrowKey(
		event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
	);
}

export function handleHomeEnd(
	event: KeyboardEvent,
	manager: KeyboardNavigationManager,
): boolean {
	if (event.key === 'Home') {
		return manager.moveFocus('first');
	}
	if (event.key === 'End') {
		return manager.moveFocus('last');
	}
	return false;
}

export function handleEscape(
	event: KeyboardEvent,
	manager: KeyboardNavigationManager,
): boolean {
	if (event.key !== 'Escape') {
		return false;
	}
	manager.deactivateContext();
	return true;
}
