import { describe, expect, it } from 'vitest';
import {
    createAguiComponentRenderedEvent,
    createAguiEvent,
    createAguiStateChangedEvent,
    createAguiUserInteractionEvent,
} from '../event-creators.js';
import {
    AGUI_EVENT_TYPES,
    type AiRecommendationEvent,
    AiRecommendationEventSchema,
    isAguiEventType,
    type UiComponentRenderedEvent,
    UiComponentRenderedEventSchema,
    type UiStateChangedEvent,
    UiStateChangedEventSchema,
    type UserInteractionEvent,
    UserInteractionEventSchema,
    validateAguiEvent,
} from '../events.js';

describe('AGUI Event Contracts', () => {
    describe('Event Schemas', () => {
        it('should validate UiComponentRenderedEvent', () => {
            const validEvent: UiComponentRenderedEvent = {
                componentId: 'btn-123',
                type: 'button',
                name: 'Submit Button',
                properties: { label: 'Submit', disabled: false },
                parentId: 'form-456',
                renderedBy: 'urn:cortex:agui-renderer',
                renderedAt: '2023-12-01T10:30:00Z',
            };

            const result = UiComponentRenderedEventSchema.parse(validEvent);
            expect(result).toEqual(validEvent);
        });

        it('should validate UserInteractionEvent', () => {
            const validEvent: UserInteractionEvent = {
                interactionId: 'int-789',
                componentId: 'btn-123',
                action: 'click',
                value: 'submit',
                coordinates: { x: 100, y: 200 },
                userId: 'user-456',
                sessionId: 'sess-789',
                interactedAt: '2023-12-01T10:31:00Z',
            };

            const result = UserInteractionEventSchema.parse(validEvent);
            expect(result).toEqual(validEvent);
        });

        it('should validate AiRecommendationEvent', () => {
            const validEvent: AiRecommendationEvent = {
                recommendationId: 'rec-123',
                type: 'accessibility',
                component: 'btn-123',
                suggestion: 'Add aria-label for better screen reader support',
                confidence: 0.85,
                priority: 'medium',
                generatedAt: '2023-12-01T10:32:00Z',
            };

            const result = AiRecommendationEventSchema.parse(validEvent);
            expect(result).toEqual(validEvent);
        });

        it('should validate UiStateChangedEvent', () => {
            const validEvent: UiStateChangedEvent = {
                stateId: 'state-456',
                componentId: 'form-456',
                previousState: { isVisible: true, values: {} },
                newState: { isVisible: true, values: { name: 'John' } },
                trigger: 'user_action',
                changedAt: '2023-12-01T10:33:00Z',
            };

            const result = UiStateChangedEventSchema.parse(validEvent);
            expect(result).toEqual(validEvent);
        });

        it('should reject invalid event data', () => {
            expect(() => {
                UiComponentRenderedEventSchema.parse({
                    componentId: 123, // should be string
                    type: 'invalid-type', // not in enum
                    name: '', // empty string
                });
            }).toThrow();

            expect(() => {
                UserInteractionEventSchema.parse({
                    interactionId: 'int-789',
                    componentId: 'btn-123',
                    action: 'invalid-action', // not in enum
                });
            }).toThrow();
        });
    });

    describe('Event Type Validation', () => {
        it('should correctly identify valid AGUI event types', () => {
            expect(isAguiEventType('agui.component.rendered')).toBe(true);
            expect(isAguiEventType('agui.user.interaction')).toBe(true);
            expect(isAguiEventType('agui.ai.recommendation')).toBe(true);
            expect(isAguiEventType('agui.state.changed')).toBe(true);
        });

        it('should reject invalid AGUI event types', () => {
            expect(isAguiEventType('invalid.event.type')).toBe(false);
            expect(isAguiEventType('agui.invalid.type')).toBe(false);
            expect(isAguiEventType('')).toBe(false);
        });

        it('should validate events using validateAguiEvent', () => {
            const validData: UiComponentRenderedEvent = {
                componentId: 'btn-123',
                type: 'button',
                name: 'Submit Button',
                renderedBy: 'urn:cortex:agui-renderer',
                renderedAt: '2023-12-01T10:30:00Z',
            };

            const result = validateAguiEvent(AGUI_EVENT_TYPES.COMPONENT_RENDERED, validData);
            expect(result).toEqual(validData);
        });

        it('should throw for unknown event types in validateAguiEvent', () => {
            expect(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                validateAguiEvent('unknown.event.type' as any, {});
            }).toThrow('Unknown AGUI event type: unknown.event.type');
        });
    });

    describe('Event Creators', () => {
        it('should create CloudEvents envelope for component rendered', () => {
            const eventData: UiComponentRenderedEvent = {
                componentId: 'btn-123',
                type: 'button',
                name: 'Submit Button',
                renderedBy: 'urn:cortex:agui-renderer',
                renderedAt: '2023-12-01T10:30:00Z',
            };

            const envelope = createAguiComponentRenderedEvent(eventData);

            expect(envelope.type).toBe(AGUI_EVENT_TYPES.COMPONENT_RENDERED);
            expect(envelope.source).toBe('urn:cortex:agui');
            expect(envelope.data).toEqual(eventData);
            expect(envelope.specversion).toBe('1.0');
            expect(envelope.id).toBeTruthy();
            expect(envelope.time).toBeTruthy();
        });

        it('should create CloudEvents envelope with custom options', () => {
            const eventData: UserInteractionEvent = {
                interactionId: 'int-789',
                componentId: 'btn-123',
                action: 'click',
                interactedAt: '2023-12-01T10:31:00Z',
            };

            const options = {
                source: 'urn:cortex:custom-source',
                traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
                correlationId: 'corr-123',
            };

            const envelope = createAguiUserInteractionEvent(eventData, options);

            expect(envelope.source).toBe(options.source);
            expect(envelope.traceparent).toBe(options.traceparent);
            expect(envelope.correlationId).toBe(options.correlationId);
        });

        it('should create events using generic createAguiEvent', () => {
            const eventData: AiRecommendationEvent = {
                recommendationId: 'rec-123',
                type: 'accessibility',
                component: 'btn-123',
                suggestion: 'Add aria-label for better screen reader support',
                confidence: 0.85,
                priority: 'medium',
                generatedAt: '2023-12-01T10:32:00Z',
            };

            const envelope = createAguiEvent(AGUI_EVENT_TYPES.AI_RECOMMENDATION, eventData);

            expect(envelope.type).toBe(AGUI_EVENT_TYPES.AI_RECOMMENDATION);
            expect(envelope.data).toEqual(eventData);
        });

        it('should throw for unknown event types in createAguiEvent', () => {
            expect(() => {
                createAguiEvent('unknown.event.type', {});
            }).toThrow('Unknown AGUI event type: unknown.event.type');
        });

        it('should validate event data in creators', () => {
            expect(() => {
                createAguiComponentRenderedEvent({
                    componentId: 123, // invalid type
                    type: 'invalid-type', // invalid enum value
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
            }).toThrow();
        });
    });

    describe('Contract Round-Trip Tests', () => {
        it('should maintain data integrity through envelope creation and parsing', () => {
            const originalData: UiStateChangedEvent = {
                stateId: 'state-456',
                componentId: 'form-456',
                previousState: { isVisible: true, values: {} },
                newState: { isVisible: true, values: { name: 'John', age: 30 } },
                trigger: 'user_action',
                changedAt: '2023-12-01T10:33:00Z',
            };

            // Create envelope
            const envelope = createAguiStateChangedEvent(originalData);

            // Extract and re-validate data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extractedData = validateAguiEvent(envelope.type as any, envelope.data);

            expect(extractedData).toEqual(originalData);
        });

        it('should preserve all CloudEvents required fields', () => {
            const eventData: UserInteractionEvent = {
                interactionId: 'int-789',
                componentId: 'btn-123',
                action: 'click',
                interactedAt: '2023-12-01T10:31:00Z',
            };

            const envelope = createAguiUserInteractionEvent(eventData);

            // Verify CloudEvents 1.0 required fields
            expect(envelope.specversion).toBe('1.0');
            expect(envelope.type).toBeTruthy();
            expect(envelope.source).toBeTruthy();
            expect(envelope.id).toBeTruthy();
            expect(envelope.time).toBeTruthy();
        });
    });
});
