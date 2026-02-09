import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { loggerInterceptor } from './logger.interceptor';
import { AppConfigStore } from '../config/app-config.service';
import { LoggerReporterService } from './logger-reporter.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

describe('loggerInterceptor (HttpInterceptorFn)', () => {
  const mockCfg = { config: jest.fn() };
  const mockReporter = { log: jest.fn() };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockCfg },
        { provide: LoggerReporterService, useValue: mockReporter }
      ]
    });

    // por defecto: logging habilitado
    mockCfg.config.mockReturnValue({
      appName: 'MyApp',
      logger: { loggers: true, loggersHost: '' }
    });

    jest.clearAllMocks();
  });

  describe('bypass', () => {
    it('bypassea cuando BYPASS_INTERCEPTORS=true (no loggea, llama next)', done => {
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/users?x=1', { context: ctx });

      const nextFn = jest
        .fn()
        .mockReturnValue(of(new HttpResponse({ status: 200, url: req.urlWithParams, body: 'ok' })));

      const obs$ = TestBed.runInInjectionContext(() => loggerInterceptor(req, nextFn));
      obs$.subscribe({
        next: evt => {
          expect(evt).toBeInstanceOf(HttpResponse);
          expect(nextFn).toHaveBeenCalledTimes(1);
          expect(nextFn).toHaveBeenCalledWith(req);
          expect(mockReporter.log).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });
  });

  describe('logger deshabilitado', () => {
    it('no loggea si logger.loggers=false', done => {
      mockCfg.config.mockReturnValue({
        appName: 'MyApp',
        logger: { loggers: false }
      });

      // ⚠️ Para POST usa body (null está bien)
      const req = new HttpRequest('POST', '/auth/login', null);
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 204 })));

      const obs$ = TestBed.runInInjectionContext(() => loggerInterceptor(req, nextFn));
      obs$.subscribe({
        next: () => {
          expect(mockReporter.log).not.toHaveBeenCalled();
          expect(nextFn).toHaveBeenCalledTimes(1);
          done();
        },
        error: done.fail
      });
    });
  });

  describe('logger habilitado', () => {
    it('loggea inicio (→) y respuesta (← [status] Xms) cuando hay HttpResponse', done => {
      // performance.now controlado: 1000 al inicio, 1123 al recibir respuesta
      const perfSpy = jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // started
        .mockReturnValueOnce(1123); // al loggear respuesta

      const req = new HttpRequest('GET', '/api/items?limit=10');

      const nextFn = jest
        .fn()
        .mockReturnValue(of(new HttpResponse({ status: 200, url: req.urlWithParams, body: [] })));

      const obs$ = TestBed.runInInjectionContext(() => loggerInterceptor(req, nextFn));
      obs$.subscribe({
        next: () => {
          // 1er log: "HTTP GET → /api/items?limit=10"
          expect(mockReporter.log).toHaveBeenNthCalledWith(
            1,
            'info',
            'HTTP GET → /api/items?limit=10'
          );

          // 2º log: "HTTP GET ← /api/items?limit=10 [200] 123ms"
          const [, msg2] = mockReporter.log.mock.calls[1];
          expect(typeof msg2).toBe('string');
          expect(msg2).toContain('HTTP GET ← /api/items?limit=10 [200] 123ms');

          expect(nextFn).toHaveBeenCalledTimes(1);
          perfSpy.mockRestore();
          done();
        },
        error: done.fail
      });
    });

    it('en caso de error, solo loggea el inicio (no hay log de respuesta)', done => {
      const perfSpy = jest.spyOn(performance, 'now').mockReturnValue(5000); // solo se usa para "inicio"

      // ⚠️ Para DELETE usa body (null) para el overload correcto
      const req = new HttpRequest('DELETE', '/api/orders/999', null);
      const nextFn = jest.fn().mockReturnValue(throwError(() => new Error('boom')));

      const obs$ = TestBed.runInInjectionContext(() => loggerInterceptor(req, nextFn));
      obs$.subscribe({
        next: () => done.fail('No debería emitir next en error'),
        error: () => {
          // Solo el log inicial
          expect(mockReporter.log).toHaveBeenCalledTimes(1);
          expect(mockReporter.log).toHaveBeenCalledWith('info', 'HTTP DELETE → /api/orders/999');
          perfSpy.mockRestore();
          done();
        }
      });
    });
  });
});
