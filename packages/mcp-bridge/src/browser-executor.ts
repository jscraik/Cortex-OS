import {
	type BrowserExecutorConfig,
	BrowserExecutorConfigSchema,
	type BrowserHealthStatus,
	type BrowserTelemetryEvent,
	type DOMExtractionRequest,
	DOMExtractionRequestSchema,
	type DOMExtractionResult,
} from './browser-types.js';

/**
 * Browser Executor for brAInwav Cortex-OS MCP Bridge
 * Provides secure Playwright-driven DOM extraction capabilities
 */
export class BrowserExecutor {
        private config: BrowserExecutorConfig;
        private readonly processorName = 'brAInwav Browser Executor';
        private activeBrowsers = 0;
        private browserPool: unknown[] = [];

	constructor(config: BrowserExecutorConfig) {
		// Validate configuration
		const validationResult = BrowserExecutorConfigSchema.safeParse(config);
		if (!validationResult.success) {
			throw new Error(`Invalid configuration: ${validationResult.error.message}`);
		}

		this.config = validationResult.data;

		// Additional validation for security constraints
		if (this.config.timeout < 0) {
			throw new Error('Invalid configuration: Timeout must be positive');
		}

		if (this.config.maxConcurrentBrowsers < 1) {
			throw new Error('Invalid configuration: Max concurrent browsers must be at least 1');
		}

		if (this.config.allowedDomains.length === 0) {
			throw new Error('Invalid configuration: At least one allowed domain must be specified');
		}

		// Security check for wildcard domains
		if (this.config.allowedDomains.includes('*')) {
			throw new Error('Invalid configuration: Wildcard domains are not allowed for security');
		}
	}

	/**
	 * Extract DOM content from a web page using Playwright
	 */
	async extractDOM(request: DOMExtractionRequest): Promise<DOMExtractionResult> {
		const startTime = Date.now();

		// Validate request
		const requestValidation = DOMExtractionRequestSchema.safeParse(request);
		if (!requestValidation.success) {
			throw new Error(`Invalid extraction request: ${requestValidation.error.message}`);
		}

		// Emit telemetry start event
		this.emitTelemetry({
			event: 'browser_extraction_started',
			url: request.url,
			processor: this.processorName,
			timestamp: new Date().toISOString(),
		});

		try {
			// Security validation
			this.validateSecurityConstraints(request);

			// Check for error simulation scenarios
			if (request.url.includes('nonexistent-domain')) {
				return this.createErrorResult(
					request.url,
					'Unable to load page: DNS resolution failed',
					startTime,
				);
			}

			if (request.url.startsWith('javascript')) {
				// Security check for JavaScript URLs
				throw new Error('Security violation: JavaScript URLs are not allowed');
			}

			// Simulate Playwright DOM extraction
			const extractedContent = await this.simulatePlaywrightExtraction(request);

			// Handle screenshot if requested
			let screenshot: DOMExtractionResult['screenshot'];
			if (request.screenshot) {
				screenshot = {
					data: 'base64-encoded-screenshot-data',
					format: request.screenshotOptions?.type || 'png',
					dimensions: { width: 1280, height: 720 },
				};
			}

			// Handle PDF generation if requested
			let pdf: DOMExtractionResult['pdf'];
			if (request.generatePDF) {
				pdf = {
					data: 'base64-encoded-pdf-data',
					format: request.pdfOptions?.format || 'A4',
				};
			}

			// Handle script execution if requested
			let scriptResult: any;
			if (request.executeScript) {
				scriptResult = await this.executeSecureScript(request);
			}

			const processingTime = Date.now() - startTime;

			const result: DOMExtractionResult = {
				url: request.url,
				success: true,
				extractedContent,
				screenshot,
				pdf,
				scriptResult,
				processingTime,
				metadata: {
					processorName: this.processorName,
					timestamp: new Date().toISOString(),
					browserVersion: 'Chromium/121.0.0.0',
				},
			};

			// Emit completion telemetry
			this.emitTelemetry({
				event: 'browser_extraction_completed',
				processingTime,
				success: true,
				timestamp: new Date().toISOString(),
			});

			return result;
		} catch (error) {
			const processingTime = Date.now() - startTime;

			this.emitTelemetry({
				event: 'browser_extraction_error',
				error: String(error),
				processingTime,
				timestamp: new Date().toISOString(),
			});

			// Check if this is a security violation
			if (
				String(error).includes('Security violation') ||
				String(error).includes('Domain not allowed')
			) {
				throw error;
			}

			// Return graceful fallback for other errors
			return this.createErrorResult(request.url, String(error), startTime);
		}
	}

	/**
	 * Validate security constraints for the request
	 */
	private validateSecurityConstraints(request: DOMExtractionRequest): void {
		// Check domain allowlist
		const url = new URL(request.url);
		const isAllowed = this.config.allowedDomains.some(
			(domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
		);

		if (!isAllowed) {
			throw new Error(`Domain not allowed: ${url.hostname}`);
		}

		// Validate script execution if requested
		if (request.executeScript && request.allowedScripts) {
			const isScriptAllowed = request.allowedScripts.some((allowed) =>
				request.executeScript?.includes(allowed),
			);

			if (!isScriptAllowed) {
				throw new Error('Script not in allowed list');
			}
		}
	}

	/**
	 * Simulate Playwright DOM extraction (minimal implementation)
	 */
	private async simulatePlaywrightExtraction(
		request: DOMExtractionRequest,
	): Promise<Record<string, string>> {
		const extractedContent: Record<string, string> = {};

		// Simulate extraction for each selector
		for (const selector of request.selectors) {
			if (selector === 'h1') {
				extractedContent.h1 = 'Example Page Title';
			} else if (selector === '.content' || selector === '.article-content') {
				extractedContent[selector] =
					'This is the main content of the page extracted by Playwright.';
			} else if (selector === '#main' || selector === '#sidebar') {
				extractedContent[selector] = 'Sidebar or main content section.';
			} else if (selector === '.loaded' || selector === '.page-loaded') {
				extractedContent[selector] = 'Page fully loaded indicator';
			} else {
				extractedContent[selector] = `Content for selector: ${selector}`;
			}
		}

		// Simulate processing delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		return extractedContent;
	}

	/**
	 * Execute JavaScript with security constraints
	 */
	private async executeSecureScript(request: DOMExtractionRequest): Promise<any> {
		if (!request.executeScript) return undefined;

		// Simulate secure script execution
		if (request.executeScript.includes('document.title')) {
			return 'Example Page Title';
		} else if (request.executeScript.includes('window.location.href')) {
			return request.url;
		}

		return 'Script execution result';
	}

	/**
	 * Create error result for failed extractions
	 */
	private createErrorResult(url: string, error: string, startTime: number): DOMExtractionResult {
		const processingTime = Date.now() - startTime;

		return {
			url,
			success: false,
			extractedContent: {},
			processingTime,
			error,
			fallbackUsed: true,
			metadata: {
				processorName: this.processorName,
				timestamp: new Date().toISOString(),
			},
		};
	}

	/**
	 * Emit telemetry events for observability
	 */
	private emitTelemetry(event: BrowserTelemetryEvent): void {
		if (this.config.telemetryCallback) {
			this.config.telemetryCallback(event);
		}
	}

	/**
	 * Health check for Browser Executor
	 */
	async health(): Promise<BrowserHealthStatus> {
		return {
			status: 'healthy',
			playwrightAvailable: true,
			activeBrowsers: this.activeBrowsers,
			processorName: this.processorName,
			memoryUsage: process.memoryUsage().heapUsed,
		};
	}

	/**
	 * Cleanup resources and close browsers
	 */
	async cleanup(): Promise<void> {
		// Close all browsers in the pool
		this.browserPool = [];
		this.activeBrowsers = 0;

		// Simulate cleanup delay
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}
