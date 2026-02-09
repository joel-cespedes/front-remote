import { HttpContext, HttpRequest } from '@angular/common/http';
import { shouldRetry } from './should-retry.helper';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AppConfig } from '../config/models/app-config.types';

describe('shouldRetry helper', () => {
  const mockConfig: AppConfig = {
    appName: 'TestApp',
    http: {
      addTokenJwt: false,
      excludeTokenJwt: [],
      retries: {
        retriesHttpRequest: true,
        maxRetries: 3,
        maxInterval: 1000,
        exceptionsHttp: []
      }
    },
    globalLoading: false,
    cache: {
      cache: false,
      maxAge: 0,
      cacheableUrls: []
    },
    trace: {
      audit: false,
      auditHost: '',
      intervalSend: 5000
    },
    logger: {
      loggers: false,
      loggersHost: ''
    },
    errors: {
      httpErrors: true,
      httpErrorsHost: 'http://localhost:3000/error',
      jsErrors: true,
      jsErrorsHost: 'http://localhost:3000/error'
    },
    apiModules: []
  };

  const mockRequest = new HttpRequest('GET', '/api/test');

  describe('BYPASS_INTERCEPTORS', () => {
    it('should return shouldRetry: false when BYPASS is true', () => {
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });

      const result = shouldRetry(req, mockConfig);

      expect(result).toEqual({ shouldRetry: false, count: 0, delay: 0 });
    });

    it('should return shouldRetry: true when BYPASS is false', () => {
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, false);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });

      const result = shouldRetry(req, mockConfig);

      expect(result.shouldRetry).toBe(true);
      expect(result.count).toBe(3);
      expect(result.delay).toBe(1000);
    });
  });

  describe('retriesHttpRequest configuration', () => {
    it('should return shouldRetry: false when retriesHttpRequest is false', () => {
      const config = {
        ...mockConfig,
        http: {
          ...mockConfig.http,
          retries: { ...mockConfig.http.retries, retriesHttpRequest: false }
        }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result).toEqual({ shouldRetry: false, count: 0, delay: 0 });
    });

    it('should return shouldRetry: true when retriesHttpRequest is true', () => {
      const result = shouldRetry(mockRequest, mockConfig);

      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('maxRetries configuration', () => {
    it('should return shouldRetry: false when maxRetries is 0', () => {
      const config = {
        ...mockConfig,
        http: { ...mockConfig.http, retries: { ...mockConfig.http.retries, maxRetries: 0 } }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result).toEqual({ shouldRetry: false, count: 0, delay: 0 });
    });

    it('should return shouldRetry: true when maxRetries > 0', () => {
      const result = shouldRetry(mockRequest, mockConfig);

      expect(result.shouldRetry).toBe(true);
      expect(result.count).toBe(3);
    });
  });

  describe('error reporting configuration', () => {
    it('should return shouldRetry: false when both httpErrors and jsErrors are false', () => {
      const config = {
        ...mockConfig,
        errors: {
          httpErrors: false,
          httpErrorsHost: 'http://localhost:3000/error',
          jsErrors: false,
          jsErrorsHost: 'http://localhost:3000/error'
        }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result).toEqual({ shouldRetry: false, count: 0, delay: 0 });
    });

    it('should return shouldRetry: true when httpErrors is true (jsErrors false)', () => {
      const config = {
        ...mockConfig,
        errors: {
          httpErrors: true,
          httpErrorsHost: 'http://localhost:3000/error',
          jsErrors: false,
          jsErrorsHost: 'http://localhost:3000/error'
        }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result.shouldRetry).toBe(true);
    });

    it('should return shouldRetry: true when jsErrors is true (httpErrors false)', () => {
      const config = {
        ...mockConfig,
        errors: {
          httpErrors: false,
          httpErrorsHost: 'http://localhost:3000/error',
          jsErrors: true,
          jsErrorsHost: 'http://localhost:3000/error'
        }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('URL exclusions', () => {
    it('should exclude URLs matching httpErrorsHost', () => {
      const req = new HttpRequest('GET', 'http://localhost:3000/error');
      const result = shouldRetry(req, mockConfig);

      expect(result.shouldRetry).toBe(false);
    });

    it('should exclude URLs matching jsErrorsHost', () => {
      const req = new HttpRequest('GET', 'http://localhost:3000/error');
      const result = shouldRetry(req, mockConfig);

      expect(result.shouldRetry).toBe(false);
    });

    it('should exclude URLs in exceptionsHttp list', () => {
      const config = {
        ...mockConfig,
        http: {
          ...mockConfig.http,
          retries: {
            ...mockConfig.http.retries,
            exceptionsHttp: ['/api/users']
          }
        }
      };

      const req = new HttpRequest('GET', '/api/users/123');
      const result = shouldRetry(req, config);

      expect(result.shouldRetry).toBe(false);
    });

    it('should NOT exclude URLs not in exceptions list', () => {
      const config = {
        ...mockConfig,
        http: {
          ...mockConfig.http,
          retries: {
            ...mockConfig.http.retries,
            exceptionsHttp: ['/api/users']
          }
        }
      };

      const req = new HttpRequest('GET', '/api/products');
      const result = shouldRetry(req, config);

      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('retry parameters', () => {
    it('should return correct count and delay values', () => {
      const result = shouldRetry(mockRequest, mockConfig);

      expect(result.shouldRetry).toBe(true);
      expect(result.count).toBe(3);
      expect(result.delay).toBe(1000);
    });

    it('should handle custom maxInterval value', () => {
      const config = {
        ...mockConfig,
        http: {
          ...mockConfig.http,
          retries: {
            ...mockConfig.http.retries,
            maxInterval: 5000
          }
        }
      };

      const result = shouldRetry(mockRequest, config);

      expect(result.delay).toBe(5000);
    });
  });
});
