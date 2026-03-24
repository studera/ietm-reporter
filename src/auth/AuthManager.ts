/**
 * Authentication Manager for IETM
 * 
 * Implements Basic Authentication with form-based login following IBM's Java client pattern.
 * Handles session management with cookies and automatic re-authentication on 401 responses.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { AuthConfig, AuthState, RetryConfig, AuthenticationError, NetworkError } from './types';

export class AuthManager {
  private config: Required<AuthConfig>;
  private axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;
  private authState: AuthState;

  constructor(config: AuthConfig) {
    // Set defaults
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000,
    };

    // Initialize cookie jar
    this.cookieJar = new CookieJar();

    // Initialize auth state
    this.authState = {
      isAuthenticated: false,
      authAttempts: 0,
    };

    // Create axios instance with cookie support
    this.axiosInstance = wrapper(
      axios.create({
        timeout: this.config.timeout,
        jar: this.cookieJar,
        withCredentials: true,
        // Basic auth credentials
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
        headers: {
          'Accept': 'application/xml',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );

    // Add response interceptor for 401 handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && !error.config?.headers?.['X-Retry-After-Auth']) {
          // Attempt form-based authentication
          try {
            await this.formBasedAuth();
            
            // Retry the original request
            const originalRequest = error.config!;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['X-Retry-After-Auth'] = 'true';
            
            return this.axiosInstance.request(originalRequest);
          } catch (authError) {
            return Promise.reject(authError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with IETM server
   * Performs initial form-based authentication to establish session
   */
  async authenticate(): Promise<void> {
    try {
      await this.formBasedAuth();
      this.authState.isAuthenticated = true;
      this.authState.lastAuthTime = new Date();
      console.log('Authentication successful');
    } catch (error) {
      this.authState.isAuthenticated = false;
      throw new AuthenticationError(
        'Failed to authenticate with IETM server',
        undefined,
        error
      );
    }
  }

  /**
   * Execute an authenticated HTTP request with retry logic
   * 
   * @param config Axios request configuration
   * @returns Response data
   */
  async executeRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: this.config.maxRetries,
      currentRetry: 0,
      retryDelay: this.config.retryDelay,
    };

    return this.executeWithRetry<T>(config, retryConfig);
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    config: AxiosRequestConfig,
    retryConfig: RetryConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request(config);
      
      // Check for successful status
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
      
      throw new AuthenticationError(
        `Request failed with status ${response.status}`,
        response.status,
        response.data
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Check if we should retry
      if (retryConfig.currentRetry < retryConfig.maxRetries) {
        const shouldRetry = this.shouldRetry(axiosError);
        
        if (shouldRetry) {
          retryConfig.currentRetry++;
          const delay = retryConfig.retryDelay * retryConfig.currentRetry;
          
          console.log(
            `Request failed, retrying (${retryConfig.currentRetry}/${retryConfig.maxRetries}) after ${delay}ms...`
          );
          
          // Wait before retry
          await this.sleep(delay);
          
          // Retry the request
          return this.executeWithRetry<T>(config, retryConfig);
        }
      }
      
      // Max retries exceeded or non-retryable error
      throw this.handleError(axiosError);
    }
  }

  /**
   * Perform form-based authentication at JTS server
   * This sets the JSESSIONID cookie for subsequent requests
   */
  private async formBasedAuth(): Promise<void> {
    this.authState.authAttempts++;
    
    const authUrl = `${this.config.jtsUrl}/jts/j_security_check`;
    const params = new URLSearchParams({
      j_username: this.config.username,
      j_password: this.config.password,
    });

    try {
      console.log(`Performing form-based authentication at ${authUrl}`);
      
      const response = await this.axiosInstance.post(authUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0, // Don't follow redirects
        validateStatus: (status) => status >= 200 && status < 400, // Accept 2xx and 3xx
      });

      // Check if authentication was successful
      // Successful auth typically returns 200 or 302
      if (response.status === 200 || response.status === 302) {
        console.log('Form-based authentication successful');
        this.authState.isAuthenticated = true;
        this.authState.lastAuthTime = new Date();
      } else {
        throw new AuthenticationError(
          `Form-based authentication failed with status ${response.status}`,
          response.status
        );
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // If it's a redirect (302/303), that's actually success
      if (axiosError.response?.status === 302 || axiosError.response?.status === 303) {
        console.log('Form-based authentication successful (redirect)');
        this.authState.isAuthenticated = true;
        this.authState.lastAuthTime = new Date();
        return;
      }
      
      console.error('Form-based authentication failed:', axiosError.message);
      throw new AuthenticationError(
        'Form-based authentication failed',
        axiosError.response?.status,
        axiosError
      );
    }
  }

  /**
   * Determine if a request should be retried based on the error
   */
  private shouldRetry(error: AxiosError): boolean {
    // Don't retry if no response (network error)
    if (!error.response) {
      return true;
    }

    const status = error.response.status;

    // Retry on server errors (5xx)
    if (status >= 500) {
      return true;
    }

    // Retry on specific client errors
    if (status === 408 || status === 429) {
      return true;
    }

    // Don't retry on other client errors (4xx)
    return false;
  }

  /**
   * Handle and transform errors into appropriate error types
   */
  private handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data || error.message;

      if (status === 401 || status === 403) {
        return new AuthenticationError(
          `Authentication failed: ${message}`,
          status,
          error.response.data
        );
      }

      return new NetworkError(
        `HTTP ${status}: ${message}`,
        error
      );
    } else if (error.request) {
      // Request made but no response received
      return new NetworkError(
        'No response received from server',
        error
      );
    } else {
      // Error setting up the request
      return new NetworkError(
        `Request setup failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the current authentication state
   */
  getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Get the axios instance (for advanced usage)
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Get the cookie jar (for inspection/debugging)
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  /**
   * Clear authentication state and cookies
   */
  async clearAuth(): Promise<void> {
    this.authState = {
      isAuthenticated: false,
      authAttempts: 0,
    };
    
    // Clear all cookies
    await this.cookieJar.removeAllCookies();
    console.log('Authentication state cleared');
  }
}

// Made with Bob
