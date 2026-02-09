import { TestBed } from '@angular/core/testing';
import { AppConfigStore } from './app-config.service';
import { AppConfig } from './models/app-config.types';

describe('AppConfigStore', () => {
  let service: AppConfigStore;
  let originalFetch: any;

  const mockConfig: AppConfig = {
    appName: 'TestApp',
    http: {
      addTokenJwt: true,
      excludeTokenJwt: [],
      retries: { retriesHttpRequest: true, maxRetries: 1, maxInterval: 100, exceptionsHttp: [] }
    },
    globalLoading: true,
    cache: { cache: true, maxAge: 60000, cacheableUrls: [] },
    trace: { audit: true, auditHost: 'https://audit.example.com' },
    logger: { loggers: true, loggersHost: 'https://log.example.com' },
    errors: {
      httpErrors: true,
      httpErrorsHost: 'https://err.example.com',
      jsErrors: true,
      jsErrorsHost: 'https://jserr.example.com'
    },
    apiModules: [{ name: 'users', baseUrl: 'https://api.example.com', path: '/users' }]
  } as any;

  const setFetchOk = (data: unknown, status = 200) => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: true,
      status,
      text: async () => '',
      json: async () => data
    });
  };

  const setFetchNotOk = (status = 500, body = 'Internal error') => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: false,
      status,
      text: async () => body,
      json: async () => {
        throw new Error('should not call json() when ok=false');
      }
    });
  };

  // 👇 MOC que fuerza que res.text() falle para cubrir `.catch(() => '')`
  const setFetchNotOkTextReject = (status = 500) => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: false,
      status,
      text: async () => {
        throw new Error('text failed');
      },
      json: async () => {
        throw new Error('should not call json() when ok=false');
      }
    });
  };

  const setFetchReject = (err: unknown) => {
    (globalThis as any).fetch.mockRejectedValue(err);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AppConfigStore]
    });

    originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = jest.fn();

    service = TestBed.inject(AppConfigStore);
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  describe('estado inicial', () => {
    it('ready() debe ser false al inicio', () => {
      expect(service.ready()).toBe(false);
    });

    it('debe lanzar error al acceder config antes de cargar', () => {
      expect(() => service.config()).toThrow('AppConfig not loaded yet');
    });
  });

  describe('load()', () => {
    it('carga el config y luego config() devuelve el objeto cargado', async () => {
      setFetchOk(mockConfig);

      await service.load('/assets/app.config.json');

      expect(service.ready()).toBe(true);
      const cfg = service.config();
      expect(cfg.appName).toBe('TestApp');
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('usa la URL por defecto "/config/app.config.json" cuando no se pasa parámetro', async () => {
      setFetchOk(mockConfig);

      const expectedUrl = new URL('/config/app.config.json', document.baseURI).toString();

      await service.load(); // sin argumentos → default

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(service.ready()).toBe(true);
      expect(service.config().appName).toBe('TestApp');
    });

    it('propaga error si la descarga falla (network error) y ready() queda en false', async () => {
      setFetchReject(new Error('network error'));

      await expect(service.load('/assets/app.config.json')).rejects.toThrow('network error');
      expect(service.ready()).toBe(false);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('lanza error rico cuando la respuesta no es OK y mantiene ready() en false', async () => {
      setFetchNotOk(500, 'Boom');

      await expect(service.load('/assets/app.config.json')).rejects.toThrow('Config 500: Boom');
      expect(service.ready()).toBe(false);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });

    // 👇 TEST que cubre `.catch(() => '')`
    it('usa cadena vacía si res.text() rechaza (catch(() => ""))', async () => {
      setFetchNotOkTextReject(404);

      await expect(service.load('/assets/app.config.json')).rejects.toThrow('Config 404: ');
      expect(service.ready()).toBe(false);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('re-intentos de lectura tras error previo', () => {
    it('después de un fallo, otra carga exitosa permite acceder a config()', async () => {
      setFetchReject(new Error('first fail'));
      await expect(service.load('/assets/app.config.json')).rejects.toThrow('first fail');
      expect(service.ready()).toBe(false);

      setFetchOk(mockConfig);
      await service.load('/assets/app.config.json');

      expect(service.ready()).toBe(true);
      expect(service.config().appName).toBe('TestApp');
    });
  });
});
