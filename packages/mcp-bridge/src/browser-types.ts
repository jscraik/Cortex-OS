import { z } from 'zod';

/**
 * Browser executor configuration schema
 */
export const BrowserExecutorConfigSchema = z.object({
    headless: z.boolean().default(true),
    timeout: z.number().min(1000).max(120000).default(30000),
    viewport: z.object({
        width: z.number().min(100).max(3840),
        height: z.number().min(100).max(2160)
    }).optional(),
    enableSandbox: z.boolean().default(true),
    allowedDomains: z.array(z.string()).min(1),
    maxConcurrentBrowsers: z.number().min(1).max(10).default(3),
    telemetryCallback: z.function().args(z.any()).returns(z.void()).optional()
});

/**
 * DOM extraction request schema
 */
export const DOMExtractionRequestSchema = z.object({
    url: z.string().url(),
    selectors: z.array(z.string()).min(1),
    waitForSelector: z.string().optional(),
    timeout: z.number().min(1000).max(60000).optional(),
    screenshot: z.boolean().optional(),
    screenshotOptions: z.object({
        fullPage: z.boolean().optional(),
        type: z.enum(['png', 'jpeg']).optional()
    }).optional(),
    generatePDF: z.boolean().optional(),
    pdfOptions: z.object({
        format: z.string().optional(),
        margin: z.object({
            top: z.string(),
            bottom: z.string(),
            left: z.string(),
            right: z.string()
        }).optional()
    }).optional(),
    executeScript: z.string().optional(),
    allowedScripts: z.array(z.string()).optional()
});

/**
 * DOM extraction result schema
 */
export const DOMExtractionResultSchema = z.object({
    url: z.string(),
    success: z.boolean(),
    extractedContent: z.record(z.string()),
    screenshot: z.object({
        data: z.string(),
        format: z.string(),
        dimensions: z.object({
            width: z.number(),
            height: z.number()
        })
    }).optional(),
    pdf: z.object({
        data: z.string(),
        format: z.string()
    }).optional(),
    scriptResult: z.any().optional(),
    processingTime: z.number(),
    error: z.string().optional(),
    fallbackUsed: z.boolean().optional(),
    metadata: z.object({
        processorName: z.string(),
        timestamp: z.string(),
        browserVersion: z.string().optional()
    })
});

/**
 * Browser health status schema
 */
export const BrowserHealthStatusSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    playwrightAvailable: z.boolean(),
    activeBrowsers: z.number(),
    processorName: z.string(),
    lastError: z.string().optional(),
    memoryUsage: z.number().optional()
});

// Export TypeScript types
export type BrowserExecutorConfig = z.infer<typeof BrowserExecutorConfigSchema>;
export type DOMExtractionRequest = z.infer<typeof DOMExtractionRequestSchema>;
export type DOMExtractionResult = z.infer<typeof DOMExtractionResultSchema>;
export type BrowserHealthStatus = z.infer<typeof BrowserHealthStatusSchema>;

/**
 * Telemetry event types for browser operations
 */
export interface BrowserTelemetryEvent {
    event: string;
    url?: string;
    processor?: string;
    processingTime?: number;
    success?: boolean;
    error?: string;
    timestamp: string;
}
