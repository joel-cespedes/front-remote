import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LoggerReporterService } from './logger-reporter.service';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

describe('LoggerReporterService', () => {
  let service: LoggerReporterService;
  let httpMock: HttpTestingController;

  // Mock del store
  const mockCfg = { config: jest.fn() };

  // Spies de consola
  let spyInfo: jest.SpyInstance;
  let spyWarn: jest.SpyInstance;
  let spyError: jest.SpyInstance;
  let spyDebug: jest.SpyInstance;

  const FIXED_NOW = new Date('2024-03-04T05:06:07.000Z');

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LoggerReporterService, { provide: AppConfigStore, useValue: mockCfg }]
    });

    service = TestBed.inject(LoggerReporterService);
    httpMock = TestBed.inject(HttpTestingController);

    // Por defecto: logging habilitado SIN host (solo consola)
    mockCfg.config.mockReturnValue({
      appName: 'MyApp',
      logger: { loggers: true } // sin loggersHost
    });

    // Spies a consola
    spyInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
    spyDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('no hace nada si logger.loggers = false (sin consola y sin HTTP)', () => {
    mockCfg.config.mockReturnValue({
      appName: 'MyApp',
      logger: { loggers: false }
    });

    service.log('info', 'hello world');

    expect(spyInfo).not.toHaveBeenCalled();
    expect(spyWarn).not.toHaveBeenCalled();
    expect(spyError).not.toHaveBeenCalled();
    expect(spyDebug).not.toHaveBeenCalled();
    // httpMock.verify() en afterEach asegura que no hubo requests
  });

  it('consola: usa console.info para nivel "info" (sin host: no HTTP)', () => {
    const ctx = { user: 123 };
    service.log('info', 'greeting', ctx);

    expect(spyInfo).toHaveBeenCalledTimes(1);
    // Primer argumento: mensaje con [appName]
    expect(spyInfo.mock.calls[0][0]).toBe('[MyApp] greeting');
    // Segundo argumento: el contexto
    expect(spyInfo.mock.calls[0][1]).toEqual(ctx);
  });

  it('consola: usa console.debug para nivel "debug" y no console.info', () => {
    service.log('debug', 'dbg');

    expect(spyDebug).toHaveBeenCalledTimes(1);
    expect(spyDebug.mock.calls[0][0]).toBe('[MyApp] dbg');
    expect(spyInfo).not.toHaveBeenCalled();
  });

  it('consola: usa console.warn y console.error según nivel', () => {
    service.log('warn', 'careful');
    service.log('error', 'boom');

    expect(spyWarn).toHaveBeenCalledWith('[MyApp] careful', '');
    expect(spyError).toHaveBeenCalledWith('[MyApp] boom', '');
  });

  it('HTTP: cuando hay loggersHost, envía POST con BYPASS_INTERCEPTORS y payload correcto', () => {
    mockCfg.config.mockReturnValue({
      appName: 'MyApp',
      logger: { loggers: true, loggersHost: 'https://logs.example/ingest' }
    });

    const payloadCtx = { id: 7, flag: true };
    service.log('warn', 'something happened', payloadCtx);

    const req = httpMock.expectOne('https://logs.example/ingest');
    expect(req.request.method).toBe('POST');

    // Verifica contexto del request: BYPASS_INTERCEPTORS = true
    expect(req.request.context.get(BYPASS_INTERCEPTORS)).toBe(true);

    // Verifica payload
    const body = req.request.body;
    expect(body).toMatchObject({
      appName: 'MyApp',
      level: 'warn',
      message: 'something happened',
      context: payloadCtx
    });
    // Timestamp ISO exacto (con tiempo fijado)
    expect(body.timestamp).toBe(FIXED_NOW.toISOString());

    // Completa la request
    req.flush({ ok: true }, { status: 204, statusText: 'No Content' });

    // También debe haberse logueado a consola
    expect(spyWarn).toHaveBeenCalledWith('[MyApp] something happened', payloadCtx);
  });

  it('HTTP: si el POST falla, el error queda silenciado (catchError→EMPTY) y no explota', () => {
    mockCfg.config.mockReturnValue({
      appName: 'MyApp',
      logger: { loggers: true, loggersHost: 'https://logs.example/ingest' }
    });

    service.log('error', 'bad things');

    const req = httpMock.expectOne('https://logs.example/ingest');
    expect(req.request.method).toBe('POST');

    // Simula error del servidor
    req.flush('fail', { status: 500, statusText: 'Server Error' });

    // Si llegamos aquí sin throw, el catchError funcionó.
    expect(spyError).toHaveBeenCalledWith('[MyApp] bad things', '');
  });
});
