export type Role = 'user' | 'assistant' | 'system';
export type ChatMessage = {
    id: string;
    role: Role;
    content: string;
    createdAt: string;
};
export type ChatSession = {
    id: string;
    modelId: string | null;
    createdAt: string;
    updatedAt: string;
    messages: ChatMessage[];
};
//# sourceMappingURL=chat.d.ts.map
