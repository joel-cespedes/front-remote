// projects/core/src/lib/retries/retry.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpContext,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { retryInterceptor } from './retry.interceptor';

// ==== Helpers seguros para HttpRequest (sin unions en constructor) ====
type Init = { headers?: HttpHeaders; context?: HttpContext };

const getReq = (url = '/api/test', init?: Init) => new HttpRequest('GET', url, init);

const postReq = (url = '/api/test', body?: any, options?: Init) =>
  new HttpRequest('POST', url, body, options);

const ok = <T = any>(body: T, url = '/api/test') => new HttpResponse<T>({ status: 200, body, url });

const err = (status = 500, url = '/api/test') =>
  new HttpErrorResponse({ status, statusText: 'ERR', url, error: `E${status}` });

/** Avanza timers para disparar los delays del retry. */
const flushTimers = () => {
  jest.runOnlyPendingTimers();
  jest.advanceTimersByTime(10_000); // amplio para cubrir varios retries
};

// Mocks
const mockAppConfigStore = { config: jest.fn() };
const mockNext = jest.fn();

describe('RetryInterceptor', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AppConfigStore, useValue: mockAppConfigStore }]
    });

    mockAppConfigStore.config.mockReturnValue({
      http: {
        retries: {
          retriesHttpRequest: true,
          maxRetries: 3,
          maxInterval: 1,
          exceptionsHttp: []
        }
      },
      errors: {
        httpErrorsHost: 'https://errors.example.com',
        jsErrorsHost: 'https://js-errors.example.com'
      },
      trace: { auditHost: 'https://audit.example.com' },
      logger: { loggersHost: 'https://logs.example.com' }
    });

    jest.clearAllMocks();
    mockNext.mockReset();
    mockNext.mockReturnValue(of(ok({ ok: true })));
  });

  describe('función isExcluded / excepciones', () => {
    it('excluye URLs listadas en exceptions (case-insensitive)', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 3,
            maxInterval: 1,
            exceptionsHttp: ['/API/HEALTH', 'STATUS']
          }
        }
      });

      const req1 = getReq('/api/health/check');
      const req2 = getReq('/api/status');

      TestBed.runInInjectionContext(() => retryInterceptor(req1, mockNext).subscribe());
      TestBed.runInInjectionContext(() => retryInterceptor(req2, mockNext).subscribe());

      expect(mockNext).toHaveBeenNthCalledWith(1, req1);
      expect(mockNext).toHaveBeenNthCalledWith(2, req2);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('cuando exceptions está vacío → reintenta', done => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 3, // 1 + 3 retries = 4 suscripciones
            maxInterval: 10,
            exceptionsHttp: []
          }
        }
      });

      const request = getReq('/api/data');
      const error = err(500, '/api/data');

      let subs = 0;
      const failing$ = new Observable<HttpResponse<any>>(observer => {
        subs++;
        observer.error(error);
      });
      mockNext.mockReturnValue(failing$);

      TestBed.runInInjectionContext(() =>
        retryInterceptor(request, mockNext).subscribe({
          next: () => done.fail('no debería emitir next'),
          error: e => {
            expect(e).toBe(error);
            expect(subs).toBe(4); // 1 original + 3 reintentos
            done();
          }
        })
      );

      flushTimers();
    });

    it('token numérico en exceptions solo excluye si aparece en la URL', done => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 5,
            maxInterval: 1,
            exceptionsHttp: ['500'] // se compara con la URL, no con el status
          }
        }
      });

      // La URL contiene "500" → debe excluir (sin retries)
      const request = getReq('/api/500/fail');
      const error = err(500, '/api/500/fail');

      let subs = 0;
      const failing$ = new Observable<HttpResponse<any>>(observer => {
        subs++;
        observer.error(error);
      });
      mockNext.mockReturnValue(failing$);

      TestBed.runInInjectionContext(() =>
        retryInterceptor(request, mockNext).subscribe({
          next: () => done.fail('no debería emitir next'),
          error: e => {
            expect(e).toBe(error);
            expect(subs).toBe(1); // sin retries por estar excluida por URL
            done();
          }
        })
      );

      flushTimers();
    });
  });

  describe('bypass', () => {
    it('respeta BYPASS_INTERCEPTORS', () => {
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });

      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuración', () => {
    it('no aplica retry si retriesHttpRequest=false', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: false, maxRetries: 3, maxInterval: 1 } }
      });

      const req = getReq('/api/x');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('no aplica retry si maxRetries=0', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: true, maxRetries: 0, maxInterval: 1 } }
      });

      const req = getReq('/api/x');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledWith(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('admite valores string (maxRetries, maxInterval)', done => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: true, maxRetries: '2', maxInterval: '10' } }
      });

      const request = getReq('/api/zzz');
      const error = err(500, '/api/zzz');

      let subs = 0;
      const failing$ = new Observable<HttpResponse<any>>(observer => {
        subs++;
        observer.error(error);
      });
      mockNext.mockReturnValue(failing$);

      TestBed.runInInjectionContext(() =>
        retryInterceptor(request, mockNext).subscribe({
          next: () => done.fail('no debería emitir next'),
          error: e => {
            expect(e).toBe(error);
            expect(subs).toBe(3); // 1 + 2 retries
            done();
          }
        })
      );

      flushTimers();
    });

    it('valores negativos → clamp a 0 (sin retry)', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: true, maxRetries: -5, maxInterval: -1 } }
      });

      const req = getReq('/api/x');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('config incompleta/undefined → no retry', () => {
      mockAppConfigStore.config.mockReturnValue({ http: {} });

      const req = getReq('/api/x');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('hosts reservados (reporters) como excepciones', () => {
    it('excluye hosts de errores/logs/audit configurados', () => {
      const req1 = getReq('https://errors.example.com/report');
      const req2 = getReq('https://logs.example.com/send');
      const req3 = getReq('https://audit.example.com/trace');

      TestBed.runInInjectionContext(() => retryInterceptor(req1, mockNext).subscribe());
      TestBed.runInInjectionContext(() => retryInterceptor(req2, mockNext).subscribe());
      TestBed.runInInjectionContext(() => retryInterceptor(req3, mockNext).subscribe());

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('combina exceptionsHttp con hosts de reporter válidos', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 3,
            maxInterval: 1,
            exceptionsHttp: ['custom-endpoint']
          }
        },
        errors: { httpErrorsHost: 'https://errors.com' }
      });

      const req1 = getReq('/api/custom-endpoint/data');
      TestBed.runInInjectionContext(() => retryInterceptor(req1, mockNext).subscribe());
      expect(mockNext).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      const req2 = getReq('https://errors.com/report');
      TestBed.runInInjectionContext(() => retryInterceptor(req2, mockNext).subscribe());
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('aplicación de retry', () => {
    it('error, error, ok → termina en éxito con el conteo correcto', done => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: true, maxRetries: 5, maxInterval: 1 } }
      });

      const request = getReq('/api/ok-after-2');
      const e = err(500, '/api/ok-after-2');
      const response = ok({ ok: true }, '/api/ok-after-2');

      let subs = 0;
      const flappy$ = new Observable<HttpResponse<any>>(observer => {
        subs++;
        if (subs < 3) {
          observer.error(e);
        } else {
          observer.next(response);
          observer.complete();
        }
      });
      mockNext.mockReturnValue(flappy$);

      TestBed.runInInjectionContext(() =>
        retryInterceptor(request, mockNext).subscribe({
          next: r => {
            expect(r).toBe(response);
            expect(subs).toBe(3); // 2 errores + 1 ok
            done();
          },
          error: done.fail
        })
      );

      flushTimers();
    });

    it('falla tras agotar los reintentos', done => {
      mockAppConfigStore.config.mockReturnValue({
        http: { retries: { retriesHttpRequest: true, maxRetries: 2, maxInterval: 10 } }
      });

      const request = getReq('/api/fail-finally');
      const e = err(500, '/api/fail-finally');

      let subs = 0;
      const alwaysFail$ = new Observable<HttpResponse<any>>(observer => {
        subs++;
        observer.error(e);
      });
      mockNext.mockReturnValue(alwaysFail$);

      TestBed.runInInjectionContext(() =>
        retryInterceptor(request, mockNext).subscribe({
          next: () => done.fail('no debería emitir next'),
          error: errFinal => {
            expect(errFinal).toBe(e);
            expect(subs).toBe(3); // 1 + 2 retries
            done();
          }
        })
      );

      flushTimers();
    });

    it('preserva headers y body de la request original', () => {
      const headers = new HttpHeaders().set('Authorization', 'Bearer token');
      const req = postReq('/api/test', { data: 'test' }, { headers });

      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());

      const passed = mockNext.mock.calls[0][0] as HttpRequest<any>;
      expect(passed.body).toEqual({ data: 'test' });
      expect(passed.headers.get('Authorization')).toBe('Bearer token');
    });
  });

  describe('edge', () => {
    it('maneja exceptionsHttp con valores vacíos/nulos mezclados', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 3,
            maxInterval: 1,
            exceptionsHttp: ['valid', null as any, undefined as any, '', 'another']
          }
        }
      });

      const req = getReq('/api/valid/test');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('maneja URL con query string', () => {
      mockAppConfigStore.config.mockReturnValue({
        http: {
          retries: {
            retriesHttpRequest: true,
            maxRetries: 2,
            maxInterval: 1,
            exceptionsHttp: ['search']
          }
        }
      });

      const req = getReq('/api/search?q=abc&limit=10');
      TestBed.runInInjectionContext(() => retryInterceptor(req, mockNext).subscribe());
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});
