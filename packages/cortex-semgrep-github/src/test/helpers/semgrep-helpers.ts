export interface SemgrepRawResult {
    check_id: string;
    message?: string;
    extra?: {
        message?: string;
        severity?: string;
        lines?: string;
        metadata?: Record<string, unknown>;
    };
    path: string;
    start?: { line: number };
    end?: { line: number };
}

export function mapSemgrepSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!severity) return 'LOW';
    const s = severity.toUpperCase();
    if (s === 'ERROR') return 'HIGH';
    if (s === 'WARNING') return 'MEDIUM';
    return 'LOW';
}

export function parseResults(output: { results?: SemgrepRawResult[] }) {
    if (!output || !Array.isArray(output.results)) return [];
    return output.results.map((result) => {
        const severity = mapSemgrepSeverity(result.extra?.severity || '');
        // Safely extract file path: look for the semgrep-scan-* marker and slice after the following slash
        let file = result.path;
        const marker = 'semgrep-scan-';
        const markerIndex = file.indexOf(marker);
        if (markerIndex !== -1) {
            const afterMarker = file.slice(markerIndex);
            const nextSlash = afterMarker.indexOf('/');
            file = nextSlash !== -1 ? afterMarker.slice(nextSlash + 1) : afterMarker;
        } else {
            // Preserve original path when no semgrep-scan marker is present
            file = result.path;
        }
        return {
            ruleId: result.check_id,
            message: result.extra?.message || result.message || 'Security issue detected',
            severity,
            file,
            startLine: result.start?.line,
            endLine: result.end?.line,
            evidence: result.extra?.lines || '',
            tags: result.extra?.metadata || {},
        };
    });
}

export function createRejectingTimeout(ms: number) {
    return new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout exceeded')), ms);
    });
}
