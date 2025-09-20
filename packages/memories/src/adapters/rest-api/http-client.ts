import type { HttpClient, RequestOptions, ApiResponse, AuthMethod, RestApiError } from './types.js';

/**
 * HTTP client implementation using fetch API
 */
export class FetchHttpClient implements HttpClient {
  private defaultHeaders: Record<string, string> = {};
  private authMethod: AuthMethod = 'none';
  private authToken?: string;
  private controller?: AbortController;

  constructor(private baseUrl: string = '') {}

  /**
   * Make an HTTP request
   */
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const timeoutMs = options.timeoutMs ?? 30000;
    const controller = new AbortController();
    this.controller = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const url = this.buildUrl(options.path, options.query);
      const headers = this.buildHeaders(options.headers);
      const body = this.buildBody(options.body);

      const response = await fetch(url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await this.parseResponse<T>(response, options.responseType);

      return {
        data: responseData,
        status: response.status,
        headers: this.parseHeaders(response.headers),
        requestId: response.headers.get('x-request-id') ?? undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Set authentication
   */
  setAuth(method: AuthMethod, token: string): void {
    this.authMethod = method;
    this.authToken = token;
  }

  /**
   * Close the client
   */
  async close(): Promise<void> {
    if (this.controller) {
      this.controller.abort();
      this.controller = undefined;
    }
  }

  /**
   * Build the complete URL
   */
  private buildUrl(path: string, query?: Record<string, string | number | boolean>): string {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    if (query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        searchParams.append(key, String(value));
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Build headers including authentication
   */
  private buildHeaders(additionalHeaders?: Record<string, string>): Headers {
    const headers = new Headers(this.defaultHeaders);

    // Add authentication
    if (this.authToken && this.authMethod !== 'none') {
      switch (this.authMethod) {
        case 'bearer':
          headers.set('Authorization', `Bearer ${this.authToken}`);
          break;
        case 'header':
          headers.set('X-API-Key', this.authToken);
          break;
      }
    }

    // Add additional headers
    if (additionalHeaders) {
      for (const [key, value] of Object.entries(additionalHeaders)) {
        headers.set(key, value);
      }
    }

    return headers;
  }

  /**
   * Build request body
   */
  private buildBody(body?: unknown): string | undefined {
    if (!body) {
      return undefined;
    }

    if (typeof body === 'string') {
      return body;
    }

    return JSON.stringify(body);
  }

  /**
   * Parse response based on expected type
   */
  private async parseResponse<T>(
    response: Response,
    responseType: 'json' | 'text' | 'blob' = 'json'
  ): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails: unknown;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      throw {
        status: response.status,
        message: `HTTP ${response.status}: ${response.statusText}`,
        details: errorDetails,
        retryable: this.isRetryableStatus(response.status),
      } as RestApiError;
    }

    switch (responseType) {
      case 'json':
        return await response.json();
      case 'text':
        return (await response.text()) as unknown as T;
      case 'blob':
        return (await response.blob()) as unknown as T;
      default:
        return await response.json();
    }
  }

  /**
   * Parse response headers
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): RestApiError {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 408,
        message: 'Request timeout',
        retryable: true,
      };
    }

    if (error && typeof error === 'object' && 'status' in error) {
      return error as RestApiError;
    }

    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
    };
  }

  /**
   * Check if a status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
    return retryableStatuses.includes(status);
  }
}