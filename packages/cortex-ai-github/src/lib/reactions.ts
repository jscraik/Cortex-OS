export const SupportedReactions = [
	'+1',
	'-1',
	'laugh',
	'confused',
	'heart',
	'hooray',
	'rocket',
	'eyes',
] as const;
export type Reaction = (typeof SupportedReactions)[number];

export const StatusToReaction: Record<
	'processing' | 'working' | 'success' | 'error' | 'warning',
	Reaction
> = {
	processing: 'eyes',
	working: 'eyes',
	success: 'rocket',
	error: '-1',
	warning: 'confused',
};
