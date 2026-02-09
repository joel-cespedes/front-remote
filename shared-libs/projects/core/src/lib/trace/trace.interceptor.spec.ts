import { TestBed } from '@angular/core/testing';
import {
  HttpContext,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
  HttpParams
} from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { traceInterceptor } from './trace.interceptor';
import { AppConfigStore } from '../config/app-config.service';
import { TraceManagerService } from './trace-manager.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

// Mock del AppConfigStore con signals
const mockAppConfigStore = {
  config: () => ({
    trace: { audit: true },
    appName: 'test-app'
  })
};

// Mock del TraceManagerService
const mockTraceManagerService: Partial<TraceManagerService> = {
  startSpan: jest.fn(),
  endSpan: jest.fn(),
  getTraceId: jest.fn(),
  getActiveSpan: jest.fn(),
  runWithSpan: jest.fn(),
  getActiveMethodName: jest.fn()
};

// Mock del span
const mockSpan = {
  traceId: 'test-trace-id-123',
  spanId: 'test-span-id-456'
};

// Mock de next handler
const mockNext = jest.fn();

describe('TraceInterceptor', () => {
  let appConfigStore: typeof mockAppConfigStore;
  let traceManagerService: typeof mockTraceManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockAppConfigStore },
        { provide: TraceManagerService, useValue: mockTraceManagerService as TraceManagerService }
      ]
    });

    appConfigStore = TestBed.inject(AppConfigStore);
    traceManagerService = TestBed.inject(TraceManagerService);

    // Reset mocks
    jest.clearAllMocks();
    (mockTraceManagerService.startSpan as jest.Mock).mockReturnValue(mockSpan);
    mockNext.mockReturnValue(of(new HttpResponse({ status: 200, body: 'success' })));
  });

  describe('cuando BYPASS_INTERCEPTORS está activo', () => {
    it('debe saltarse el interceptor y llamar next directamente', () => {
      // Arrange
      const context = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/test', { context });

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe();
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockTraceManagerService.startSpan).not.toHaveBeenCalled();
    });
  });

  describe('cuando trace.audit está deshabilitado', () => {
    beforeEach(() => {
      // Cambiar el comportamiento del mock para este test
      mockAppConfigStore.config = jest.fn().mockReturnValue({ trace: { audit: false } });
    });

    it('debe saltarse el interceptor cuando audit es false', () => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe();
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockTraceManagerService.startSpan).not.toHaveBeenCalled();
    });

    it('debe saltarse el interceptor cuando trace es undefined', () => {
      // Arrange
      mockAppConfigStore.config = jest.fn().mockReturnValue({});
      const req = new HttpRequest('GET', '/api/test');

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe();
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockTraceManagerService.startSpan).not.toHaveBeenCalled();
    });
  });

  describe('cuando trace.audit está habilitado', () => {
    beforeEach(() => {
      // Asegurar que el mock vuelva al estado habilitado
      mockAppConfigStore.config = jest.fn().mockReturnValue({
        trace: { audit: true },
        appName: 'test-app'
      });
    });

    it('debe crear un span y agregar headers de tracing', () => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test?param=value');

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe();
      });

      // Assert
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith('HTTP GET', 'http', {
        url: '/api/test?param=value'
      });

      const capturedReq = mockNext.mock.calls[0][0] as HttpRequest<any>;
      expect(capturedReq.headers.get('X-Trace-Id')).toBe('test-trace-id-123');
      expect(capturedReq.headers.get('X-Span-Id')).toBe('test-span-id-456');
    });

    it('debe manejar diferentes métodos HTTP correctamente', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        jest.clearAllMocks();
        const req = new HttpRequest(method as any, '/api/test');

        // Act
        TestBed.runInInjectionContext(() => {
          traceInterceptor(req, mockNext).subscribe();
        });

        // Assert
        expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(`HTTP ${method}`, 'http', {
          url: '/api/test'
        });
      });
    });

    it('debe finalizar el span cuando la respuesta es exitosa', done => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');
      const httpResponse = new HttpResponse({ status: 200, body: { data: 'test' } });
      mockNext.mockReturnValue(of(httpResponse));

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe({
          next: response => {
            // Assert
            expect(response).toBe(httpResponse);
            expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { status: 200 });
            done();
          }
        });
      });
    });

    it('debe finalizar el span con status diferente cuando hay error HTTP', done => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');
      const httpResponse = new HttpResponse({ status: 404, body: null });
      mockNext.mockReturnValue(of(httpResponse));

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe({
          next: () => {
            // Assert
            expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { status: 404 });
            done();
          }
        });
      });
    });

    it('debe finalizar el span con error cuando falla la petición', done => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');
      const error = new Error('Network error');
      mockNext.mockReturnValue(throwError(() => error));

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe({
          error: err => {
            // Assert
            expect(err).toBe(error);
            expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, {
              error: 'Network error'
            });
            done();
          }
        });
      });
    });

    it('debe manejar errores que no son instancia de Error', done => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');
      const error = 'String error message';
      mockNext.mockReturnValue(throwError(() => error));

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe({
          error: () => {
            // Assert
            expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, {
              error: 'String error message'
            });
            done();
          }
        });
      });
    });

    it('debe manejar HttpErrorResponse correctamente', done => {
      // Arrange
      const req = new HttpRequest('GET', '/api/test');
      const httpError = new HttpErrorResponse({
        error: 'Server error',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test'
      });
      mockNext.mockReturnValue(throwError(() => httpError));

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe({
          error: () => {
            // Assert - HttpErrorResponse se convierte a "[object Object]" con String()
            expect(mockTraceManagerService.endSpan as jest.Mock).toHaveBeenCalledWith(mockSpan, {
              error: '[object Object]'
            });
            done();
          }
        });
      });
    });

    it('debe preservar la URL con parámetros en el span', () => {
      // Arrange
      const url = '/api/users';
      const params = new HttpParams().set('page', '1').set('limit', '10').set('search', 'john doe');
      const req = new HttpRequest('GET', url, null, { params });

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(req, mockNext).subscribe();
      });

      // Assert
      expect(mockTraceManagerService.startSpan as jest.Mock).toHaveBeenCalledWith(
        'HTTP GET',
        'http',
        { url: '/api/users?page=1&limit=10&search=john%20doe' }
      );
    });

    it('debe clonar la request sin modificar la original', () => {
      // Arrange
      const originalReq = new HttpRequest('POST', '/api/test', { data: 'test' });
      const originalHeaders = originalReq.headers;

      // Act
      TestBed.runInInjectionContext(() => {
        traceInterceptor(originalReq, mockNext).subscribe();
      });

      // Assert
      expect(originalReq.headers).toBe(originalHeaders);
      expect(originalReq.headers.has('X-Trace-Id')).toBe(false);
      expect(originalReq.headers.has('X-Span-Id')).toBe(false);

      const clonedReq = mockNext.mock.calls[0][0] as HttpRequest<any>;
      expect(clonedReq).not.toBe(originalReq);
      expect(clonedReq.headers.has('X-Trace-Id')).toBe(true);
      expect(clonedReq.headers.has('X-Span-Id')).toBe(true);
    });
  });
});
