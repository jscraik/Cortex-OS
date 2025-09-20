import type { ProcessingConfig } from '../policy/mime.js';
import type { Chunker, DocumentChunk, ProcessingFile } from './dispatch.js';

export interface HierarchicalChunk extends DocumentChunk {
    level: 'document' | 'section' | 'paragraph';
    parentId?: string;
    childrenIds?: string[];
}

/**
 * Simple hierarchical chunker:
 * - Document level: summary of first 500 chars
 * - Section level: split by markdown headings (#+) or double newlines as fallback
 * - Paragraph level: split each section by blank lines
 */
export class HierarchicalChunker implements Chunker {
    async chunk(file: ProcessingFile, config: ProcessingConfig): Promise<HierarchicalChunk[]> {
        const text = file.content.toString('utf-8');
        const chunks: HierarchicalChunk[] = [];

        // Document level summary
        const docId = `${file.path}-doc`;
        const docChunk: HierarchicalChunk = {
            id: docId,
            content: text.slice(0, 500),
            metadata: { type: 'document_summary', level: 'document' },
            level: 'document',
            childrenIds: [],
        };
        chunks.push(docChunk);

        // Extract sections by markdown headings; fallback to double-newline blocks
        const sections = this.extractSections(text);
        sections.forEach((section, index) => {
            const sectionId = `${file.path}-section-${index + 1}`;
            const sectionChunk: HierarchicalChunk = {
                id: sectionId,
                content: section.content.trim(),
                metadata: {
                    type: 'section',
                    level: 'section',
                    heading: section.heading,
                    parentId: docId,
                    sectionIndex: index + 1,
                },
                level: 'section',
                parentId: docId,
                childrenIds: [],
            };
            chunks.push(sectionChunk);
            // maintain children list without non-null assertions
            const docChildren = Array.isArray(docChunk.childrenIds) ? docChunk.childrenIds : [];
            docChildren.push(sectionId);
            docChunk.childrenIds = docChildren;

            // Paragraphs
            const paragraphs = this.extractParagraphs(section.content);
            paragraphs.forEach((para, pIndex) => {
                const paraId = `${sectionId}-para-${pIndex + 1}`;
                const paraChunk: HierarchicalChunk = {
                    id: paraId,
                    content: para.trim(),
                    metadata: {
                        type: 'paragraph',
                        level: 'paragraph',
                        parentId: sectionId,
                        paragraphIndex: pIndex + 1,
                    },
                    level: 'paragraph',
                    parentId: sectionId,
                };
                chunks.push(paraChunk);
                const secChildren = Array.isArray(sectionChunk.childrenIds) ? sectionChunk.childrenIds : [];
                secChildren.push(paraId);
                sectionChunk.childrenIds = secChildren;
            });
        });

        // reference config to avoid unused param lint (placeholder for future tuning)
        if (config && typeof config === 'object') {
            // no-op
        }
        return chunks;
    }

    private extractSections(text: string): Array<{ heading: string; content: string }> {
        const lines = text.split(/\r?\n/);
        const sections: Array<{ heading: string; content: string }> = [];
        let currentHeading = 'Document';
        let currentContent: string[] = [];

        const pushSection = () => {
            if (currentContent.length) {
                sections.push({ heading: currentHeading, content: currentContent.join('\n') });
                currentContent = [];
            }
        };

        for (const line of lines) {
            const m = /^(#{1,6})\s+(.*)$/.exec(line);
            if (m) {
                pushSection();
                currentHeading = m[2].trim();
            } else {
                currentContent.push(line);
            }
        }
        pushSection();

        // Fallback: if only one section and heading was default, split by double newlines
        if (sections.length <= 1) {
            const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
            return blocks.map((b, i) => ({ heading: `Section ${i + 1}`, content: b }));
        }
        return sections;
    }

    private extractParagraphs(sectionContent: string): string[] {
        return sectionContent
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
    }
}
