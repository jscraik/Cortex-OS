// Accessibility utilities for WCAG 2.2 AA compliance

export class A11yUtils {
  // Generate accessible color contrast
  static getContrastRatio(foreground: string, background: string): number {
    // Convert hex to RGB
    const fgRgb = this.hexToRgb(foreground);
    const bgRgb = this.hexToRgb(background);

    // Calculate relative luminance
    const fgLuminance = this.getRelativeLuminance(fgRgb);
    const bgLuminance = this.getRelativeLuminance(bgRgb);

    // Calculate contrast ratio
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  // Check if color contrast meets WCAG 2.2 AA requirements
  static meetsAaContrast(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 4.5; // AA requirement for normal text
  }

  // Check if color contrast meets WCAG 2.2 AAA requirements
  static meetsAaaContrast(foreground: string, background: string): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 7.0; // AAA requirement for normal text
  }

  // Convert hex color to RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse RGB values
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  // Calculate relative luminance
  private static getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    // Convert RGB to sRGB
    const sRgb = {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
    };

    // Apply gamma correction
    const r = sRgb.r <= 0.03928 ? sRgb.r / 12.92 : Math.pow((sRgb.r + 0.055) / 1.055, 2.4);
    const g = sRgb.g <= 0.03928 ? sRgb.g / 12.92 : Math.pow((sRgb.g + 0.055) / 1.055, 2.4);
    const b = sRgb.b <= 0.03928 ? sRgb.b / 12.92 : Math.pow((sRgb.b + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Generate screen reader-friendly text
  static generateSrText(text: string, context?: string): string {
    // In a real implementation, this would handle more complex cases
    // For now, we'll just return the text with context if provided
    return context ? `${text} (${context})` : text;
  }

  // Create accessible keyboard navigation
  static createKeyboardNavHandler(
    items: HTMLElement[],
    onSelect: (item: HTMLElement, index: number) => void,
  ): (event: KeyboardEvent) => void {
    let currentIndex = 0;

    return (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          currentIndex = (currentIndex + 1) % items.length;
          items[currentIndex].focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          currentIndex = (currentIndex - 1 + items.length) % items.length;
          items[currentIndex].focus();
          break;
        case 'Enter':
          event.preventDefault();
          onSelect(items[currentIndex], currentIndex);
          break;
        case 'Escape':
          event.preventDefault();
          // Close or blur the component
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          break;
      }
    };
  }

  // Generate ARIA labels for interactive elements
  static generateAriaLabel(elementType: string, action: string, context?: string): string {
    const baseLabel = `${action} ${elementType}`;
    return context ? `${baseLabel} ${context}` : baseLabel;
  }
}

// Example usage
function example() {
  // Check color contrast
  console.log('Contrast ratio (black/white):', A11yUtils.getContrastRatio('#000000', '#FFFFFF'));
  console.log('Meets AA contrast:', A11yUtils.meetsAaContrast('#000000', '#FFFFFF'));

  // Generate screen reader text
  console.log('Screen reader text:', A11yUtils.generateSrText('Close', 'Close dialog'));

  // Generate ARIA label
  console.log('ARIA label:', A11yUtils.generateAriaLabel('button', 'Submit', 'Contact form'));
}

// Run example if this file is executed directly
if (require.main === module) {
  example();
}

export default A11yUtils;
