import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { httpErrorInterceptor } from './http-error.interceptor';
import { AppConfigStore } from '../config/app-config.service';
import { ErrorReporterService } from './error-reporter.service';
import { TraceManagerService } from '../trace/trace-manager.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

describe('httpErrorInterceptor (HttpInterceptorFn)', () => {
  // Mocks
  const mockStore = { config: jest.fn() };
  const mockReporter: jest.Mocked<Pick<ErrorReporterService, 'reportHttp'>> = {
    reportHttp: jest.fn<void, [any]>()
  };
  const mockTM: jest.Mocked<Pick<TraceManagerService, 'getTraceId' | 'getActiveMethodName'>> = {
    getTraceId: jest.fn<string, []>(),
    getActiveMethodName: jest.fn<string, []>()
  };

  const enabledCfg = {
    appName: 'MyApp',
    errors: {
      httpErrors: true,
      httpErrorsHost: 'https://err/http',
      jsErrors: true,
      jsErrorsHost: 'https://err/js'
    },
    logger: { loggers: true }
  };

  const disabledCfg = {
    appName: 'MyApp',
    errors: { httpErrors: false },
    logger: { loggers: false }
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockStore },
        { provide: ErrorReporterService, useValue: mockReporter },
        { provide: TraceManagerService, useValue: mockTM }
      ]
    });
    jest.clearAllMocks();

    mockTM.getTraceId.mockReturnValue('trace-123');
    mockTM.getActiveMethodName.mockReturnValue('GET /things');
  });

  it('bypassea cuando BYPASS_INTERCEPTORS=true (no reporta, llama next)', done => {
    mockStore.config.mockReturnValue(enabledCfg);

    const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
    const req = new HttpRequest('GET', '/api/users?x=1', { context: ctx });

    const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: evt => {
        expect(evt).toBeInstanceOf(HttpResponse);
        expect(nextFn).toHaveBeenCalledTimes(1);
        expect(nextFn).toHaveBeenCalledWith(req);
        expect(mockReporter.reportHttp).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('si está deshabilitado (errors=false y logger=false) no reporta y pasa tal cual', done => {
    mockStore.config.mockReturnValue(disabledCfg);

    const req = new HttpRequest('GET', '/api/items');

    const httpErr = new HttpErrorResponse({
      status: 500,
      statusText: 'Server',
      url: '/api/items',
      error: 'boom'
    });

    const nextFn = jest.fn().mockReturnValue(throwError(() => httpErr));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: () => done.fail('no debería emitir next'),
      error: e => {
        expect(e).toBe(httpErr); // repropaga porque nosotros no interceptamos (salió por early return)
        expect(mockReporter.reportHttp).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('cuando está habilitado y ocurre HttpErrorResponse, reporta y repropaga el error', done => {
    mockStore.config.mockReturnValue(enabledCfg);

    const req = new HttpRequest('GET', '/api/orders?limit=10');

    const httpErr = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      url: '/api/orders?limit=10',
      error: { msg: 'not found' }
    });

    const nextFn = jest.fn().mockReturnValue(throwError(() => httpErr));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: () => done.fail('no debería emitir next en error'),
      error: e => {
        expect(e).toBe(httpErr); // repropaga
        expect(mockReporter.reportHttp).toHaveBeenCalledTimes(1);

        const payload = mockReporter.reportHttp.mock.calls[0][0];
        expect(payload).toMatchObject({
          message: httpErr.message || 'HTTP error',
          url: '/api/orders?limit=10',
          method: 'GET',
          status: 404,
          statusText: 'Not Found',
          extra: {
            traceId: 'trace-123',
            activeMethodSpan: 'GET /things'
          }
        });
        done();
      }
    });
  });

  it('usa req.url cuando err.url es null (fallback)', done => {
    mockStore.config.mockReturnValue(enabledCfg);

    const req = new HttpRequest('GET', '/api/fallback?x=1');

    const httpErr = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: 'bad'
    });
    const nextFn = jest.fn().mockReturnValue(throwError(() => httpErr));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: () => done.fail('no debería emitir next'),
      error: () => {
        const payload = mockReporter.reportHttp.mock.calls[0][0];
        expect(payload.url).toBe('/api/fallback?x=1'); // fallback correcto
        done();
      }
    });
  });

  it('en éxito HTTP no reporta', done => {
    mockStore.config.mockReturnValue(enabledCfg);

    const req = new HttpRequest('GET', '/api/ok');
    const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: resp => {
        expect(resp).toBeInstanceOf(HttpResponse);
        expect(mockReporter.reportHttp).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('si el error no es HttpErrorResponse, no reporta y repropaga', done => {
    mockStore.config.mockReturnValue(enabledCfg);

    const req = new HttpRequest('GET', '/api/non-http-error');
    const nextFn = jest.fn().mockReturnValue(throwError(() => new Error('boom')));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: () => done.fail('no debería emitir next'),
      error: e => {
        expect(e).toBeInstanceOf(Error);
        expect(mockReporter.reportHttp).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('cuando está habilitado solo por logger.loggers=true también reporta', done => {
    // errors deshabilitado, pero logger true -> enabled
    mockStore.config.mockReturnValue({
      appName: 'MyApp',
      errors: { httpErrors: false },
      logger: { loggers: true }
    });

    const req = new HttpRequest('GET', '/api/only-logger');
    const httpErr = new HttpErrorResponse({
      status: 500,
      statusText: 'Server',
      url: '/api/only-logger',
      error: 'boom'
    });
    const nextFn = jest.fn().mockReturnValue(throwError(() => httpErr));

    const obs$ = TestBed.runInInjectionContext(() => httpErrorInterceptor(req, nextFn));
    obs$.subscribe({
      next: () => done.fail('no debería emitir next'),
      error: () => {
        expect(mockReporter.reportHttp).toHaveBeenCalledTimes(1);
        done();
      }
    });
  });
});
