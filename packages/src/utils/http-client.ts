import { createLogger } from './logger.js';

const logger = createLogger('HttpClient');

/**
 * HTTP request method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  validateStatus?: (status: number) => boolean;
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: HttpRequestOptions;
  ok: boolean;
}

/**
 * HTTP error interface
 */
export interface HttpError extends Error {
  status?: number;
  statusText?: string;
  data?: any;
  config?: HttpRequestOptions;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

/**
 * Default request options
 */
const defaultOptions: HttpRequestOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  validateStatus: (status: number) => status >= 200 && status < 300
};

/**
 * HTTP Client for making API requests with retry capability
 */
export class HttpClient {
  private baseUrl: string;
  private defaultOptions: HttpRequestOptions;

  constructor(baseUrl: string = '', options: HttpRequestOptions = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultOptions = { ...defaultOptions, ...options };
  }

  /**
   * Set the base URL for requests
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Set default request options
   */
  public setDefaultOptions(options: HttpRequestOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Add authorization header
   */
  public setAuthToken(token: string, scheme: string = 'Bearer'): void {
    if (!this.defaultOptions.headers) {
      this.defaultOptions.headers = {};
    }
    this.defaultOptions.headers['Authorization'] = `${scheme} ${token}`;
  }

  /**
   * Clear authorization header
   */
  public clearAuthToken(): void {
    if (this.defaultOptions.headers && this.defaultOptions.headers['Authorization']) {
      delete this.defaultOptions.headers['Authorization'];
    }
  }

  /**
   * Make a GET request
   */
  public async get<T = any>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  public async post<T = any>(path: string, data?: any, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body: data });
  }

  /**
   * Make a PUT request
   */
  public async put<T = any>(path: string, data?: any, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body: data });
  }

  /**
   * Make a PATCH request
   */
  public async patch<T = any>(path: string, data?: any, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body: data });
  }

  /**
   * Make a DELETE request
   */
  public async delete<T = any>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Make an HTTP request with retry capability
   */
  public async request<T = any>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const config = this.mergeOptions(options);
    const url = this.buildUrl(path, config.params);
    
    let attempt = 0;
    const maxAttempts = (config.retries || 0) + 1;
    
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        const response = await this.fetchWithTimeout<T>(url, config);
        return response;
      } catch (error) {
        const httpError = error as HttpError;
        
        // Don't retry if it's not a network error or timeout
        if (!httpError.isNetworkError && !httpError.isTimeout) {
          throw httpError;
        }
        
        // Don't retry if this was the last attempt
        if (attempt >= maxAttempts) {
          if (httpError.isTimeout) {
            logger.error('Request timed out after all retry attempts', {
              url,
              method: config.method,
              attempts: attempt,
              timeout: config.timeout
            });
          } else {
            logger.error('Network error after all retry attempts', {
              url,
              method: config.method,
              attempts: attempt,
              error: httpError.message
            });
          }
          throw httpError;
        }
        
        // Wait before retry
        const delay = typeof config.retryDelay === 'number' ? config.retryDelay : 1000;
        logger.warn(`Retrying request (${attempt}/${maxAttempts - 1})`, {
          url,
          method: config.method,
          delay,
          error: httpError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never happen, but TypeScript requires a return
    throw new Error('Unexpected end of request method');
  }

  /**
   * Merge default options with request-specific options
   */
  private mergeOptions(options: HttpRequestOptions): HttpRequestOptions {
    const result = { ...this.defaultOptions, ...options };
    
    // Merge headers
    result.headers = {
      ...this.defaultOptions.headers,
      ...options.headers
    };
    
    return result;
  }

  /**
   * Build the request URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    
    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
      }
    }
    
    return url;
  }
  
  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T = any>(url: string, config: HttpRequestOptions): Promise<HttpResponse<T>> {
    const { method, headers, body, timeout, validateStatus } = config;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;
    
    try {
      const fetchOptions: RequestInit = {
        signal: controller.signal
      };
      
      if (method) {
        fetchOptions.method = method;
      }
      
      if (headers) {
        fetchOptions.headers = headers;
      }
      
      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, fetchOptions);
      
      // Parse response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // Determine if response is valid based on status validator
      const isValidStatus = validateStatus ? validateStatus(response.status) : response.ok;
      
      // Parse response data based on content type
      let data: T;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text() as unknown as T;
      } else {
        // For binary data, return blob
        data = await response.blob() as unknown as T;
      }
      
      const result: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config,
        ok: isValidStatus
      };
      
      // If status is not valid, throw error
      if (!isValidStatus) {
        const error: HttpError = new Error(`Request failed with status code ${response.status}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = data;
        error.config = config;
        throw error;
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout error
        if (error.name === 'AbortError') {
          const timeoutError: HttpError = new Error(`Request timeout of ${timeout}ms exceeded`);
          timeoutError.isTimeout = true;
          timeoutError.config = config;
          throw timeoutError;
        }
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          const networkError: HttpError = new Error('Network error');
          networkError.isNetworkError = true;
          networkError.config = config;
          throw networkError;
        }
        
        // Rethrow HTTP errors
        if ((error as HttpError).status) {
          throw error;
        }
      }
      
      // Rethrow unknown errors
      throw error;
    } finally {
      // Clear the timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }
} 