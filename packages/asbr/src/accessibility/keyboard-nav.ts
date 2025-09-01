/**
 * Keyboard Navigation Support
 * Implements WCAG 2.2 AA keyboard accessibility requirements
 */

import { handleArrow, handleEscape, handleHomeEnd, handleTab } from './lib/key-handlers.js';

export interface KeyboardHandlerOptions {
  trapFocus?: boolean;
  escapeHandler?: () => void;
  enterHandler?: () => void;
  tabHandler?: (direction: 'forward' | 'backward') => void;
  arrowHandler?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export interface FocusableElement {
  id: string;
  element: HTMLElement;
  role?: string;
  disabled?: boolean;
  ariaLabel?: string;
  tabIndex?: number;
}

export interface NavigationContext {
  name: string;
  elements: FocusableElement[];
  currentIndex: number;
  wrap: boolean;
  orientation: 'horizontal' | 'vertical' | 'both';
}

/**
 * Keyboard navigation manager for accessibility
 */
export class KeyboardNavigationManager {
  private contexts = new Map<string, NavigationContext>();
  private activeContext: string | null = null;
  private focusStack: string[] = [];
  private eventListeners = new Map<string, (event: KeyboardEvent) => void>();

  /**
   * Register a navigation context
   */
  registerContext(contextId: string, context: Omit<NavigationContext, 'currentIndex'>): void {
    this.contexts.set(contextId, {
      ...context,
      currentIndex: 0,
    });
  }

  /**
   * Activate a navigation context
   */
  activateContext(contextId: string): void {
    if (!this.contexts.has(contextId)) {
      throw new Error(`Navigation context '${contextId}' not found`);
    }

    // Push current context to stack if it exists
    if (this.activeContext) {
      this.focusStack.push(this.activeContext);
    }

    this.activeContext = contextId;
    this.setupKeyboardHandlers(contextId);
    this.focusCurrentElement();
  }

  /**
   * Deactivate current context and return to previous
   */
  deactivateContext(): void {
    if (this.activeContext) {
      this.cleanupKeyboardHandlers(this.activeContext);
      this.activeContext = null;
    }

    // Return to previous context if available
    if (this.focusStack.length > 0) {
      const previousContext = this.focusStack.pop()!;
      this.activateContext(previousContext);
    }
  }

  /**
   * Move focus within the active context
   */
  moveFocus(direction: 'next' | 'previous' | 'first' | 'last'): boolean {
    if (!this.activeContext) {
      return false;
    }

    const context = this.contexts.get(this.activeContext)!;
    const focusableElements = context.elements.filter((el) => !el.disabled);

    if (focusableElements.length === 0) {
      return false;
    }

    let newIndex: number;

    switch (direction) {
      case 'next':
        newIndex = context.currentIndex + 1;
        if (newIndex >= focusableElements.length) {
          newIndex = context.wrap ? 0 : context.currentIndex;
        }
        break;

      case 'previous':
        newIndex = context.currentIndex - 1;
        if (newIndex < 0) {
          newIndex = context.wrap ? focusableElements.length - 1 : context.currentIndex;
        }
        break;

      case 'first':
        newIndex = 0;
        break;

      case 'last':
        newIndex = focusableElements.length - 1;
        break;

      default:
        return false;
    }

    if (newIndex !== context.currentIndex) {
      context.currentIndex = newIndex;
      this.focusCurrentElement();
      return true;
    }

    return false;
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowKey(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): boolean {
    if (!this.activeContext) {
      return false;
    }

    const context = this.contexts.get(this.activeContext)!;

    switch (context.orientation) {
      case 'horizontal':
        if (key === 'ArrowLeft') {
          return this.moveFocus('previous');
        } else if (key === 'ArrowRight') {
          return this.moveFocus('next');
        }
        break;

      case 'vertical':
        if (key === 'ArrowUp') {
          return this.moveFocus('previous');
        } else if (key === 'ArrowDown') {
          return this.moveFocus('next');
        }
        break;

      case 'both':
        // For grid-like navigation, implement 2D movement
        return this.handleGridNavigation(key);
    }

    return false;
  }

  /**
   * Add focus trap to prevent focus from leaving a context
   */
  addFocusTrap(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (!context) {
      return;
    }

    const trapHandler = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && this.activeContext === contextId) {
        const focusableElements = context.elements.filter((el) => !el.disabled);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement;

        if (event.shiftKey) {
          // Backward tab
          if (currentElement === firstElement.element) {
            event.preventDefault();
            lastElement.element.focus();
            context.currentIndex = focusableElements.length - 1;
          }
        } else {
          // Forward tab
          if (currentElement === lastElement.element) {
            event.preventDefault();
            firstElement.element.focus();
            context.currentIndex = 0;
          }
        }
      }
    };

    document.addEventListener('keydown', trapHandler);
    this.eventListeners.set(`${contextId}-trap`, trapHandler);
  }

  /**
   * Remove focus trap
   */
  removeFocusTrap(contextId: string): void {
    const handler = this.eventListeners.get(`${contextId}-trap`);
    if (handler) {
      document.removeEventListener('keydown', handler);
      this.eventListeners.delete(`${contextId}-trap`);
    }
  }

  /**
   * Get keyboard shortcuts help text
   */
  getKeyboardShortcuts(contextId?: string): string[] {
    const shortcuts = [
      'Tab - Navigate to next element',
      'Shift+Tab - Navigate to previous element',
      'Enter - Activate focused element',
      'Space - Toggle or activate (where applicable)',
      'Escape - Cancel or close',
    ];

    if (contextId) {
      const context = this.contexts.get(contextId);
      if (context) {
        switch (context.orientation) {
          case 'horizontal':
            shortcuts.push('Arrow Left/Right - Navigate between items');
            break;
          case 'vertical':
            shortcuts.push('Arrow Up/Down - Navigate between items');
            break;
          case 'both':
            shortcuts.push('Arrow Keys - Navigate in any direction');
            break;
        }

        if (context.wrap) {
          shortcuts.push('Navigation wraps around at boundaries');
        }
      }
    }

    return shortcuts;
  }

  /**
   * Update accessibility attributes
   */
  updateAccessibilityAttributes(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (!context) {
      return;
    }

    context.elements.forEach((element, index) => {
      const htmlElement = element.element;

      // Set ARIA attributes
      htmlElement.setAttribute('role', element.role || 'button');
      htmlElement.setAttribute('tabindex', element.disabled ? '-1' : '0');

      if (element.ariaLabel) {
        htmlElement.setAttribute('aria-label', element.ariaLabel);
      }

      // Set position in set
      htmlElement.setAttribute('aria-setsize', context.elements.length.toString());
      htmlElement.setAttribute('aria-posinset', (index + 1).toString());

      // Set disabled state
      if (element.disabled) {
        htmlElement.setAttribute('aria-disabled', 'true');
      } else {
        htmlElement.removeAttribute('aria-disabled');
      }

      // Set current state
      if (index === context.currentIndex && contextId === this.activeContext) {
        htmlElement.setAttribute('aria-current', 'true');
      } else {
        htmlElement.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Announce navigation state changes
   */
  announceNavigationState(contextId: string): string {
    const context = this.contexts.get(contextId);
    if (!context) {
      return '';
    }

    const currentElement = context.elements[context.currentIndex];
    if (!currentElement) {
      return '';
    }

    const position = context.currentIndex + 1;
    const total = context.elements.length;
    const label = currentElement.ariaLabel || currentElement.id;

    return `${label}, ${position} of ${total}`;
  }

  private focusCurrentElement(): void {
    if (!this.activeContext) {
      return;
    }

    const context = this.contexts.get(this.activeContext)!;
    const currentElement = context.elements[context.currentIndex];

    if (currentElement && !currentElement.disabled) {
      currentElement.element.focus();
      this.updateAccessibilityAttributes(this.activeContext);
    }
  }

  private setupKeyboardHandlers(contextId: string): void {
    const keyHandler = (event: KeyboardEvent) => {
      if (this.activeContext !== contextId) {
        return;
      }

      const handled =
        handleTab(event, this) ||
        handleArrow(event, this) ||
        handleHomeEnd(event, this) ||
        handleEscape(event, this);

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', keyHandler);
    this.eventListeners.set(contextId, keyHandler);
  }

  private cleanupKeyboardHandlers(contextId: string): void {
    const handler = this.eventListeners.get(contextId);
    if (handler) {
      document.removeEventListener('keydown', handler);
      this.eventListeners.delete(contextId);
    }

    this.removeFocusTrap(contextId);
  }

  private handleGridNavigation(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): boolean {
    // Simplified grid navigation - in a real implementation,
    // this would handle 2D grid movement based on element positions
    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        return this.moveFocus('previous');
      case 'ArrowDown':
      case 'ArrowRight':
        return this.moveFocus('next');
    }
    return false;
  }
}

/**
 * Create keyboard navigation manager singleton
 */
let keyboardManager: KeyboardNavigationManager | null = null;

export function getKeyboardNavigationManager(): KeyboardNavigationManager {
  if (!keyboardManager) {
    keyboardManager = new KeyboardNavigationManager();
  }
  return keyboardManager;
}

/**
 * Utility function to create focusable element from DOM element
 */
export function createFocusableElement(
  element: HTMLElement,
  options: Partial<FocusableElement> = {},
): FocusableElement {
  return {
    id: options.id || element.id || `focusable-${Date.now()}`,
    element,
    role: options.role || element.getAttribute('role') || undefined,
    disabled: options.disabled || element.hasAttribute('disabled'),
    ariaLabel: options.ariaLabel || element.getAttribute('aria-label') || undefined,
    tabIndex: options.tabIndex || parseInt(element.getAttribute('tabindex') || '0'),
  };
}
