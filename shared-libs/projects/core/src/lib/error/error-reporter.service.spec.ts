import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ErrorReporterService } from './error-reporter.service';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { ErrorPayload } from './models/error-payload.model';

describe('ErrorReporterService', () => {
  let service: ErrorReporterService;
  let httpMock: HttpTestingController;

  const mockStore = { config: jest.fn() };

  // Spies de consola (group puede ser undefined en algunos entornos)
  let spyGroup: jest.SpyInstance | null = null;
  let spyGroupEnd: jest.SpyInstance | null = null;
  let spyError: jest.SpyInstance;

  const FIXED_NOW = new Date('2024-06-01T12:34:56.000Z');

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function setupWithConfig(cfg: any) {
    TestBed.resetTestingModule();
    mockStore.config.mockReturnValue(cfg);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ErrorReporterService, { provide: AppConfigStore, useValue: mockStore }]
    });

    service = TestBed.inject(ErrorReporterService);
    httpMock = TestBed.inject(HttpTestingController);

    // Aseguramos que existan group/groupEnd para espiar
    if (!console.group) (console as any).group = () => {};
    if (!console.groupEnd) (console as any).groupEnd = () => {};
    spyGroup = jest.spyOn(console, 'group');
    spyGroupEnd = jest.spyOn(console, 'groupEnd');
    spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
  }

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  const baseCfg = {
    appName: 'MyApp',
    logger: { loggers: true },
    errors: {
      httpErrors: true,
      httpErrorsHost: 'https://err.example/http',
      jsErrors: true,
      jsErrorsHost: 'https://err.example/js'
    }
  };

  describe('reportHttp()', () => {
    it('envía POST a httpErrorsHost con BYPASS_INTERCEPTORS y loguea en consola', () => {
      setupWithConfig(baseCfg);

      service.reportHttp({
        message: 'Request failed',
        url: '/api/users',
        method: 'GET',
        status: 500,
        statusText: 'Server Error',
        extra: { retried: 1 }
      });

      const req = httpMock.expectOne('https://err.example/http');
      expect(req.request.method).toBe('POST');

      // context BYPASS_INTERCEPTORS
      expect(req.request.context.get(BYPASS_INTERCEPTORS)).toBe(true);

      // body con appName, type y timestamp fijado
      const body = req.request.body as ErrorPayload;
      expect(body).toMatchObject({
        appName: 'MyApp',
        type: 'http',
        message: 'Request failed',
        url: '/api/users',
        method: 'GET',
        status: 500,
        statusText: 'Server Error',
        extra: { retried: 1 }
      });
      expect(body.timestamp).toBe(FIXED_NOW.toISOString());

      // Completar request
      req.flush({ ok: true }, { status: 204, statusText: 'No Content' });

      // Console grouping + error payload
      expect(spyGroup!.mock.calls[0][0]).toContain('HTTP ERROR @ MyApp'); // ⛑️ ... mayúsculas ya en servicio
      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyGroupEnd).toHaveBeenCalledTimes(1);
    });

    it('no envía POST si está deshabilitado o falta host', () => {
      // httpErrors deshabilitado
      setupWithConfig({
        ...baseCfg,
        errors: { ...baseCfg.errors, httpErrors: false }
      });

      service.reportHttp({ message: 'fail' });
      httpMock.expectNone('https://err.example/http');

      // falta host
      setupWithConfig({
        ...baseCfg,
        errors: { ...baseCfg.errors, httpErrorsHost: undefined }
      });

      service.reportHttp({ message: 'fail' });
      httpMock.expectNone('https://err.example/http');
    });

    it('silencia error del servidor (catchError→EMPTY)', () => {
      setupWithConfig(baseCfg);

      service.reportHttp({ message: 'boom' });
      const req = httpMock.expectOne('https://err.example/http');
      expect(() => req.flush('x', { status: 500, statusText: 'ERR' })).not.toThrow();
    });
  });

  describe('reportJs()', () => {
    it('envía POST a jsErrorsHost con Error (message+stack) y BYPASS_INTERCEPTORS', () => {
      setupWithConfig(baseCfg);

      const err = new Error('Kaboom');
      err.stack = 'STACK';
      service.reportJs(err);

      const req = httpMock.expectOne('https://err.example/js');
      expect(req.request.method).toBe('POST');
      expect(req.request.context.get(BYPASS_INTERCEPTORS)).toBe(true);

      const body = req.request.body as ErrorPayload;
      expect(body).toMatchObject({
        appName: 'MyApp',
        type: 'js',
        message: 'Kaboom',
        stack: 'STACK'
      });
      expect(body.timestamp).toBe(FIXED_NOW.toISOString());

      req.flush({}, { status: 204, statusText: 'No Content' });
      expect(spyError).toHaveBeenCalledTimes(1);
    });

    it('usa el string directamente si err es string', () => {
      setupWithConfig(baseCfg);

      service.reportJs('plain text error');
      const req = httpMock.expectOne('https://err.example/js');
      const body = req.request.body as ErrorPayload;
      expect(body.message).toBe('plain text error');
      req.flush({}, { status: 204, statusText: 'No Content' });
    });

    it('para objeto circular, message cae a "[object Object]" (safeString)', () => {
      setupWithConfig(baseCfg);

      const a: any = {};
      a.self = a;
      service.reportJs(a);

      const req = httpMock.expectOne('https://err.example/js');
      const body = req.request.body as ErrorPayload;
      expect(body.message).toBe('[object Object]');
      req.flush({}, { status: 204, statusText: 'No Content' });
    });

    it('no envía POST si jsErrors deshabilitado o falta host', () => {
      // deshabilitado
      setupWithConfig({
        ...baseCfg,
        errors: { ...baseCfg.errors, jsErrors: false }
      });
      service.reportJs(new Error('e'));
      httpMock.expectNone('https://err.example/js');

      // falta host
      setupWithConfig({
        ...baseCfg,
        errors: { ...baseCfg.errors, jsErrorsHost: undefined }
      });
      service.reportJs(new Error('e'));
      httpMock.expectNone('https://err.example/js');
    });
  });

  describe('console logging controlado por logger.loggers', () => {
    it('no escribe en consola cuando logger.loggers=false', () => {
      setupWithConfig({
        ...baseCfg,
        logger: { loggers: false }
      });

      service.reportHttp({ message: 'no console please' });
      httpMock.expectOne('https://err.example/http').flush({}, { status: 204, statusText: 'OK' });

      expect(spyGroup!.mock.calls.length).toBe(0);
      expect(spyGroupEnd!.mock.calls.length).toBe(0);
      expect(spyError).not.toHaveBeenCalled();
    });
  });

  describe('report(payload) directo', () => {
    it('respeta payload.type http/js y elige el host correcto', () => {
      setupWithConfig(baseCfg);

      const pHttp: ErrorPayload = {
        appName: 'MyApp',
        type: 'http',
        message: 'm1',
        timestamp: FIXED_NOW.toISOString(),
        url: '/u'
      };
      service.report(pHttp);
      httpMock.expectOne('https://err.example/http').flush({}, { status: 204, statusText: 'OK' });

      const pJs: ErrorPayload = {
        appName: 'MyApp',
        type: 'js',
        message: 'm2',
        timestamp: FIXED_NOW.toISOString()
      };
      service.report(pJs);
      httpMock.expectOne('https://err.example/js').flush({}, { status: 204, statusText: 'OK' });
    });
  });
  it('silencia error del servidor también en JS (catchError→EMPTY)', () => {
    setupWithConfig(baseCfg);

    service.reportJs(new Error('oops'));
    const req = httpMock.expectOne('https://err.example/js');

    // fuerza error del backend y verifica que no explota (EMPTY)
    expect(() => req.flush('fail', { status: 500, statusText: 'ERR' })).not.toThrow();
  });
});
