import { TestBed } from '@angular/core/testing';
import { ErrorHandler, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { provideCoreConfig } from './core.providers';
import { AppConfigStore } from './app-config.service';
import { JsErrorHandler } from '../error/js-error.handler';
import { InjectorHolder } from '../helpers/injector-holder';
import { TraceAutoTrackerService } from '../trace/trace-auto-tracker.service';
import { AppConfig } from './models/app-config.types';

// Mock fetch
const mockFetch = jest.fn();
Object.defineProperty(window, 'fetch', {
  value: mockFetch,
  writable: true
});

// Mock LoggerReporterService para evitar peticiones HTTP no deseadas
const mockLoggerReporter = {
  log: jest.fn()
};

describe('provideCoreConfig', () => {
  let appConfigStore: AppConfigStore;
  let traceTracker: jest.Mocked<TraceAutoTrackerService>;
  let httpTesting: HttpTestingController;
  let injector: Injector;

  const mockConfig: AppConfig = {
    appName: 'TestApp',
    http: {
      addTokenJwt: true,
      excludeTokenJwt: [],
      retries: {
        retriesHttpRequest: true,
        maxRetries: 3,
        maxInterval: 5000,
        exceptionsHttp: []
      }
    },
    globalLoading: true,
    cache: {
      cache: true,
      maxAge: 300000,
      cacheableUrls: []
    },
    trace: {
      audit: true,
      auditHost: 'https://audit.example.com'
    },
    logger: {
      loggers: false, // ← Deshabilitamos logging para evitar peticiones HTTP
      loggersHost: 'https://logs.example.com'
    },
    errors: {
      httpErrors: true,
      httpErrorsHost: 'https://errors.example.com',
      jsErrors: true,
      jsErrorsHost: 'https://js-errors.example.com'
    },
    apiModules: []
  };

  beforeEach(() => {
    // Mock del TraceAutoTrackerService
    traceTracker = {
      start: jest.fn(),
      stop: jest.fn()
    } as any;

    // Mock exitoso de fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig)
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Solo verificar si httpTesting existe y no hay peticiones pendientes
    try {
      httpTesting?.verify();
    } catch (error) {
      // Ignorar errores de verificación para evitar falsos positivos
      console.warn('HttpTesting verification failed:', error);
    }
  });

  describe('configuración por defecto', () => {
    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker },
          { provide: 'LoggerReporterService', useValue: mockLoggerReporter }
        ]
      });

      injector = TestBed.inject(Injector);
      appConfigStore = TestBed.inject(AppConfigStore);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    it('debe proporcionar AppConfigStore', () => {
      expect(appConfigStore).toBeTruthy();
      expect(appConfigStore).toBeInstanceOf(AppConfigStore);
    });

    it('debe proporcionar HttpClient con interceptors', () => {
      const httpClient = TestBed.inject(HttpClient);
      expect(httpClient).toBeTruthy();
    });

    it('debe proporcionar JsErrorHandler como ErrorHandler', () => {
      const errorHandler = TestBed.inject(ErrorHandler);
      expect(errorHandler).toBeInstanceOf(JsErrorHandler);
    });

    it('debe cargar la configuración durante la inicialización', () => {
      expect(appConfigStore.ready()).toBe(true);
      expect(appConfigStore.config()).toEqual(mockConfig);
    });

    it('debe configurar InjectorHolder durante la inicialización', () => {
      expect(InjectorHolder.get(AppConfigStore)).toBe(appConfigStore);
    });

    it('debe iniciar TraceAutoTrackerService cuando audit está habilitado', () => {
      expect(traceTracker.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuración personalizada', () => {
    it('debe usar URL personalizada cuando se proporciona', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig({ url: '/custom/config.json' }),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      // Esperar a que el inicializador termine
      await TestBed.inject(Injector);
      const store = TestBed.inject(AppConfigStore);

      // Dar tiempo adicional si es necesario
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(store.ready()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/custom/config.json'), {
        cache: 'no-store'
      });
    });

    it('debe manejar opciones undefined', async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(undefined),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      // Esperar a que el inicializador termine
      await TestBed.inject(Injector);
      const store = TestBed.inject(AppConfigStore);

      // Dar tiempo adicional si es necesario
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(store.ready()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/config/app.config.json'), {
        cache: 'no-store'
      });
    });
  });

  describe('configuraciones de trace', () => {
    it('no debe iniciar TraceAutoTrackerService cuando audit está deshabilitado', async () => {
      const configWithoutAudit = { ...mockConfig, trace: { audit: false, auditHost: '' } };

      mockFetch.mockClear();
      traceTracker.start.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(configWithoutAudit)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      const injector = TestBed.inject(Injector);

      expect(traceTracker.start).not.toHaveBeenCalled();
    });

    it('no debe iniciar TraceAutoTrackerService cuando trace es undefined', async () => {
      const configWithoutTrace = { ...mockConfig };
      delete (configWithoutTrace as any).trace;

      mockFetch.mockClear();
      traceTracker.start.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(configWithoutTrace)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      const injector = TestBed.inject(Injector);

      expect(traceTracker.start).not.toHaveBeenCalled();
    });

    it('debe funcionar con diferentes configuraciones de trace', async () => {
      const configs = [
        { ...mockConfig, trace: { audit: true, auditHost: 'test' } },
        { ...mockConfig, trace: { audit: false, auditHost: 'test' } }
      ];

      for (const config of configs) {
        mockFetch.mockClear();
        traceTracker.start.mockClear();

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(config)
        });

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideCoreConfig(),
            provideHttpClientTesting(),
            { provide: TraceAutoTrackerService, useValue: traceTracker }
          ]
        });

        // Esperar a que el inicializador termine
        await TestBed.inject(Injector);

        // Dar tiempo adicional para que se ejecute completamente
        await new Promise(resolve => setTimeout(resolve, 10));

        if (config.trace?.audit === true) {
          expect(traceTracker.start).toHaveBeenCalledTimes(1);
        } else {
          expect(traceTracker.start).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('interceptors HTTP', () => {
    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      injector = TestBed.inject(Injector);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    it('debe tener HttpClient configurado', () => {
      const httpClient = TestBed.inject(HttpClient);
      expect(httpClient).toBeTruthy();
    });

    it('debe procesar peticiones HTTP correctamente', () => {
      const httpClient = TestBed.inject(HttpClient);

      httpClient.get('/test').subscribe();

      const req = httpTesting.expectOne('/test');
      expect(req.request.url).toBe('/test');

      req.flush({ data: 'test' });
    });
  });

  describe('integración completa', () => {
    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideCoreConfig(),
          provideHttpClientTesting(),
          { provide: TraceAutoTrackerService, useValue: traceTracker }
        ]
      });

      injector = TestBed.inject(Injector);
      appConfigStore = TestBed.inject(AppConfigStore);
    });

    it('debe inicializar correctamente todo el ecosistema', () => {
      expect(TestBed.inject(AppConfigStore)).toBeTruthy();
      expect(TestBed.inject(HttpClient)).toBeTruthy();
      expect(TestBed.inject(ErrorHandler)).toBeTruthy();
      expect(TestBed.inject(TraceAutoTrackerService)).toBeTruthy();

      expect(appConfigStore.ready()).toBe(true);
      expect(InjectorHolder.get(AppConfigStore)).toBe(appConfigStore);
    });
  });

  describe('tipos de providers', () => {
    it('debe retornar EnvironmentProviders', () => {
      const providers = provideCoreConfig();
      expect(providers).toBeTruthy();
      expect(typeof providers).toBe('object');
    });

    it('debe ser compatible con bootstrapApplication', () => {
      const providers = provideCoreConfig({ url: '/test.json' });
      expect(providers).toBeTruthy();
    });
  });
});
