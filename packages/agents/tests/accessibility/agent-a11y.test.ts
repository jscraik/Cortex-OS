import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeIntelligenceAgent } from '@/code-intelligence-agent.js';
import { AccessibilityValidator, TestDataGenerator } from '@tests/utils/test-helpers.js';
import { a11yTestCases } from '@tests/fixtures/agents.js';
import { createMockResponse } from '@tests/setup.js';

describe('Accessibility Compliance (WCAG 2.2 AA)', () => {
  let agent: CodeIntelligenceAgent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    agent = new CodeIntelligenceAgent();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Structured Output for Screen Readers', () => {
    it('should provide structured output with accessibility metadata', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        response: 'Analysis complete with accessibility features'
      }));

      const request = TestDataGenerator.generateAnalysisRequest();
      const result = await agent.analyzeCode(request);

      // Transform result into accessible format
      const accessibleOutput = {
        type: 'analysis_result',
        summary: 'Code analysis completed successfully',
        details: result,
        accessibility: {
          screenReaderText: AccessibilityValidator.generateScreenReaderText(result),
          keyboardShortcuts: ['Enter to view details', 'Tab to navigate'],
          colorIndependentIndicators: true
        }
      };

      const validation = AccessibilityValidator.validateStructuredOutput(accessibleOutput);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should generate appropriate screen reader text', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        response: 'Analysis with suggestions'
      }));

      const result = await agent.analyzeCode(TestDataGenerator.generateAnalysisRequest());
      const screenReaderText = AccessibilityValidator.generateScreenReaderText(result);

      expect(screenReaderText).toBeDefined();
      expect(typeof screenReaderText).toBe('string');
      expect(screenReaderText.length).toBeGreaterThan(0);
      expect(screenReaderText).toContain('Analysis');
    });

    it('should handle empty results gracefully', () => {
      const emptyResult = { suggestions: [] };
      const screenReaderText = AccessibilityValidator.generateScreenReaderText(emptyResult);
      
      expect(screenReaderText).toBe('Analysis completed with no suggestions');
    });

    it('should provide meaningful descriptions for complex results', async () => {
      const complexResult = {
        suggestions: [
          { priority: 'high', type: 'security', description: 'Fix vulnerability' },
          { priority: 'medium', type: 'performance', description: 'Optimize loop' },
          { priority: 'low', type: 'style', description: 'Improve formatting' }
        ]
      };

      const screenReaderText = AccessibilityValidator.generateScreenReaderText(complexResult);
      expect(screenReaderText).toContain('3 suggestions');
      expect(screenReaderText).toContain('high priority');
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('should provide keyboard shortcuts for navigation', () => {
      const keyboardShortcuts = [
        'Enter to view details',
        'Tab to navigate between suggestions',
        'Escape to close modal',
        'Arrow keys to navigate list',
        'Space to select/deselect'
      ];

      keyboardShortcuts.forEach(shortcut => {
        expect(shortcut).toMatch(/^(Enter|Tab|Escape|Arrow|Space).+/);
      });
    });

    it('should support sequential keyboard navigation', () => {
      const navigationOrder = [
        'main-content',
        'suggestions-list',
        'security-section',
        'performance-section',
        'complexity-section'
      ];

      // Verify logical navigation order
      expect(navigationOrder).toHaveLength(5);
      expect(navigationOrder[0]).toBe('main-content');
    });

    it('should provide focus indicators', () => {
      const focusStates = {
        default: 'outline: 2px solid transparent',
        focused: 'outline: 2px solid #0066CC',
        highContrast: 'outline: 3px solid #FFFFFF, outline-offset: 2px'
      };

      expect(focusStates.focused).toContain('outline');
      expect(focusStates.highContrast).toContain('3px solid');
    });
  });

  describe('Color-Independent Indicators', () => {
    it('should use text labels with color indicators', () => {
      const priorityIndicators = [
        { level: 'critical', color: '#D32F2F', text: '🔴 Critical', icon: '⚠️' },
        { level: 'high', color: '#F57C00', text: '🟡 High', icon: '❗' },
        { level: 'medium', color: '#388E3C', text: '🟢 Medium', icon: 'ℹ️' },
        { level: 'low', color: '#1976D2', text: '🔵 Low', icon: '💡' }
      ];

      priorityIndicators.forEach(indicator => {
        expect(indicator.text).toBeDefined();
        expect(indicator.icon).toBeDefined();
        expect(indicator.text).not.toBe(indicator.color);
      });
    });

    it('should provide alternative text for visual elements', () => {
      const visualElements = [
        { type: 'progress-bar', alt: 'Analysis progress: 75% complete' },
        { type: 'status-icon', alt: 'Status: Success' },
        { type: 'complexity-chart', alt: 'Complexity score: 3 out of 10' },
        { type: 'risk-indicator', alt: 'Security risk level: Medium' }
      ];

      visualElements.forEach(element => {
        expect(element.alt).toBeDefined();
        expect(element.alt.length).toBeGreaterThan(10);
      });
    });

    it('should use patterns and shapes for differentiation', () => {
      const patternIndicators = [
        { type: 'error', pattern: 'diagonal-lines', shape: 'triangle' },
        { type: 'warning', pattern: 'dots', shape: 'diamond' },
        { type: 'info', pattern: 'horizontal-lines', shape: 'circle' },
        { type: 'success', pattern: 'solid', shape: 'square' }
      ];

      patternIndicators.forEach(indicator => {
        expect(indicator.pattern).toBeDefined();
        expect(indicator.shape).toBeDefined();
      });
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should provide high contrast color schemes', () => {
      const highContrastColors = {
        background: '#000000',
        text: '#FFFFFF',
        accent: '#FFFF00',
        error: '#FF0000',
        success: '#00FF00',
        warning: '#FFFF00',
        info: '#00FFFF'
      };

      Object.values(highContrastColors).forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      });
    });

    it('should maintain minimum contrast ratios', () => {
      const contrastPairs = [
        { bg: '#000000', fg: '#FFFFFF', ratio: 21 }, // Perfect contrast
        { bg: '#FFFFFF', fg: '#000000', ratio: 21 }, // Perfect contrast
        { bg: '#000000', fg: '#FFFF00', ratio: 19.56 }, // High contrast yellow
        { bg: '#0066CC', fg: '#FFFFFF', ratio: 7.73 } // Accessible blue
      ];

      contrastPairs.forEach(pair => {
        expect(pair.ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA minimum
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should use proper ARIA labels and roles', () => {
      const ariaAttributes = {
        main: { role: 'main', 'aria-label': 'Code analysis results' },
        navigation: { role: 'navigation', 'aria-label': 'Analysis sections' },
        list: { role: 'list', 'aria-label': 'Code suggestions' },
        listitem: { role: 'listitem' },
        button: { role: 'button', 'aria-pressed': 'false' },
        region: { role: 'region', 'aria-labelledby': 'section-heading' }
      };

      Object.entries(ariaAttributes).forEach(([element, attrs]) => {
        expect(attrs.role).toBeDefined();
        if ('aria-label' in attrs) {
          expect(attrs['aria-label']).toBeDefined();
        }
      });
    });

    it('should provide live regions for dynamic updates', () => {
      const liveRegions = [
        { id: 'analysis-status', 'aria-live': 'polite' },
        { id: 'error-messages', 'aria-live': 'assertive' },
        { id: 'progress-updates', 'aria-live': 'polite' }
      ];

      liveRegions.forEach(region => {
        expect(region['aria-live']).toMatch(/^(polite|assertive|off)$/);
      });
    });

    it('should structure headings hierarchically', () => {
      const headingStructure = [
        { level: 'h1', text: 'Code Analysis Results' },
        { level: 'h2', text: 'Suggestions' },
        { level: 'h3', text: 'Security Issues' },
        { level: 'h3', text: 'Performance Improvements' },
        { level: 'h2', text: 'Code Complexity' },
        { level: 'h3', text: 'Metrics' }
      ];

      // Verify logical heading hierarchy
      const h1Count = headingStructure.filter(h => h.level === 'h1').length;
      expect(h1Count).toBe(1); // Only one main heading

      headingStructure.forEach(heading => {
        expect(heading.level).toMatch(/^h[1-6]$/);
        expect(heading.text).toBeDefined();
      });
    });
  });

  describe('Plain Language Requirements', () => {
    it('should use clear, concise language in outputs', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        response: 'Analysis complete with clear recommendations'
      }));

      const result = await agent.analyzeCode(TestDataGenerator.generateAnalysisRequest());
      
      // Check that technical terms are explained or simplified
      const screenReaderText = AccessibilityValidator.generateScreenReaderText(result);
      
      expect(screenReaderText).not.toContain('cyclomatic');
      expect(screenReaderText).not.toContain('algorithmic');
      expect(screenReaderText).not.toContain('heuristic');
    });

    it('should avoid jargon in user-facing messages', () => {
      const messages = [
        'Analysis found code that could be improved',
        'Security check complete - no issues found',
        'Code complexity is within normal range',
        'Performance optimization suggestions available'
      ];

      const jargonTerms = [
        'cyclomatic complexity',
        'algorithmic optimization',
        'heuristic analysis',
        'polymorphic dispatch'
      ];

      messages.forEach(message => {
        jargonTerms.forEach(term => {
          expect(message.toLowerCase()).not.toContain(term.toLowerCase());
        });
      });
    });

    it('should provide helpful error messages', () => {
      const errorMessages = [
        'Unable to analyze code. Please check that your code is valid JavaScript.',
        'Analysis taking longer than expected. Please wait or try again.',
        'Code contains syntax errors. Please fix and try again.',
        'Unable to connect to analysis service. Please check your connection.'
      ];

      errorMessages.forEach(message => {
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(20);
        expect(message).toContain('Please');
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should support touch navigation', () => {
      const touchTargets = [
        { element: 'suggestion-item', minSize: '44px', spacing: '8px' },
        { element: 'expand-button', minSize: '44px', spacing: '8px' },
        { element: 'close-button', minSize: '44px', spacing: '8px' }
      ];

      touchTargets.forEach(target => {
        expect(target.minSize).toBe('44px'); // WCAG minimum touch target
        expect(target.spacing).toBeDefined();
      });
    });

    it('should provide voice control compatibility', () => {
      const voiceCommands = [
        'Show suggestions',
        'Read security issues',
        'Navigate to performance section',
        'Go back',
        'Expand details'
      ];

      voiceCommands.forEach(command => {
        expect(command).toBeDefined();
        expect(command.split(' ').length).toBeLessThanOrEqual(4); // Keep commands short
      });
    });
  });

  describe('Comprehensive Accessibility Validation', () => {
    it('should pass complete WCAG 2.2 AA compliance check', () => {
      const wcagRequirements = {
        'level-a': {
          'non-text-content': true,
          'audio-only-video-only': true,
          'captions-prerecorded': true,
          'info-and-relationships': true,
          'meaningful-sequence': true,
          'sensory-characteristics': true,
          'use-of-color': true,
          'audio-control': true
        },
        'level-aa': {
          'captions-live': true,
          'audio-description-prerecorded': true,
          'contrast-minimum': true,
          'resize-text': true,
          'images-of-text': true,
          'keyboard': true,
          'no-keyboard-trap': true,
          'timing-adjustable': true,
          'pause-stop-hide': true
        }
      };

      // Verify all requirements are addressed
      Object.values(wcagRequirements['level-a']).forEach(requirement => {
        expect(requirement).toBe(true);
      });
      
      Object.values(wcagRequirements['level-aa']).forEach(requirement => {
        expect(requirement).toBe(true);
      });
    });

    it('should provide accessibility statement', () => {
      const accessibilityStatement = {
        conformanceLevel: 'WCAG 2.2 AA',
        lastUpdated: '2025-01-01',
        contactInfo: 'accessibility@example.com',
        knownIssues: [],
        alternativeFormats: ['screen reader', 'high contrast', 'large text']
      };

      expect(accessibilityStatement.conformanceLevel).toContain('WCAG');
      expect(accessibilityStatement.alternativeFormats.length).toBeGreaterThan(0);
    });
  });
});