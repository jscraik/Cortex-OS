/**
 * Topic access control list for the A2A bus.
 *
 * Each topic must explicitly opt-in to publish and/or subscribe permissions.
 * Topics without an entry are denied for both actions by default.
 */
export interface TopicACL {
    [topic: string]: {
        publish?: boolean;
        subscribe?: boolean;
    };
}
//# sourceMappingURL=topic-acl.d.ts.map