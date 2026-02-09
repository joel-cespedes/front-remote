import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';

import { jwtAuthInterceptor } from './jwt.interceptor';
import { AppConfigStore } from '../config/app-config.service';
import { AuthTokenService } from './auth-token.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

describe('jwtAuthInterceptor', () => {
  let mockConfigStore: jest.Mocked<AppConfigStore>;
  let mockAuthTokenService: jest.Mocked<AuthTokenService>;

  beforeEach(() => {
    mockConfigStore = {
      config: jest.fn()
    } as any;

    mockAuthTokenService = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      has: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockConfigStore },
        { provide: AuthTokenService, useValue: mockAuthTokenService }
      ]
    });

    jest.clearAllMocks();
  });

  describe('bypass del interceptor', () => {
    it('debe saltarse cuando BYPASS_INTERCEPTORS está activo', () => {
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(mockConfigStore.config).not.toHaveBeenCalled();
      expect(mockAuthTokenService.get).not.toHaveBeenCalled();
    });

    it('debe procesar normalmente cuando BYPASS_INTERCEPTORS es false', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: false, excludeTokenJwt: [] }
      } as any);

      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, false);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockConfigStore.config).toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith(req);
    });
  });

  describe('configuración addTokenJwt', () => {
    it('no debe agregar token cuando addTokenJwt es false', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: false, excludeTokenJwt: [] }
      } as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(mockAuthTokenService.get).not.toHaveBeenCalled();
    });

    it('no debe agregar token cuando addTokenJwt es undefined', () => {
      mockConfigStore.config.mockReturnValue({
        http: { excludeTokenJwt: [] }
      } as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(mockAuthTokenService.get).not.toHaveBeenCalled();
    });

    it('no debe agregar token cuando http config es undefined', () => {
      mockConfigStore.config.mockReturnValue({} as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(mockAuthTokenService.get).not.toHaveBeenCalled();
    });

    it('debe proceder cuando addTokenJwt es true', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: [] }
      } as any);
      mockAuthTokenService.get.mockReturnValue('valid-token');

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockAuthTokenService.get).toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({})
        })
      );
    });
  });

  describe('manejo de tokens', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: [] }
      } as any);
    });

    it('no debe agregar header cuando no hay token', () => {
      mockAuthTokenService.get.mockReturnValue(null);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
    });

    it('no debe agregar header cuando token es string vacío', () => {
      mockAuthTokenService.get.mockReturnValue('');

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
    });

    it('debe agregar Authorization header con Bearer token', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      mockAuthTokenService.get.mockReturnValue(testToken);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
    });

    it('debe preservar headers existentes', () => {
      const testToken = 'test-token';
      mockAuthTokenService.get.mockReturnValue(testToken);

      const req = new HttpRequest(
        'POST',
        '/api/test',
        { data: 'test' },
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json', 'X-Custom': 'value' })
        }
      );
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
      expect(modifiedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(modifiedRequest.headers.get('X-Custom')).toBe('value');
    });

    it('debe sobrescribir Authorization header existente', () => {
      const newToken = 'new-token';
      mockAuthTokenService.get.mockReturnValue(newToken);

      const req = new HttpRequest('GET', '/api/test', null, {
        headers: new HttpHeaders({ Authorization: 'Bearer old-token' })
      });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    });
  });

  describe('exclusión de URLs', () => {
    beforeEach(() => {
      mockAuthTokenService.get.mockReturnValue('valid-token');
    });

    it('no debe agregar token a URLs excluidas', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: ['auth', 'login'] }
      } as any);

      const req = new HttpRequest('POST', '/api/auth/login', { username: 'test' });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(req.headers.has('Authorization')).toBe(false);
    });

    it('debe ser case-insensitive para exclusiones', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: ['AUTH', 'Login'] }
      } as any);

      const req = new HttpRequest('POST', '/api/auth/login', { username: 'test' });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(req.headers.has('Authorization')).toBe(false);
    });

    it('debe incluir parámetros de query en la verificación de exclusión', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: ['refresh'] }
      } as any);

      const req = new HttpRequest('GET', '/api/auth/token?type=refresh&user=123');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      expect(req.headers.has('Authorization')).toBe(false);
    });

    it('debe agregar token cuando URL no está excluida', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: ['auth', 'login'] }
      } as any);

      const req = new HttpRequest('GET', '/api/users/profile');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer valid-token');
    });

    it('debe manejar excludeTokenJwt undefined', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: undefined }
      } as any);

      const req = new HttpRequest('GET', '/api/users');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer valid-token');
    });

    it('debe manejar excludeTokenJwt array vacío', () => {
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: [] }
      } as any);

      const req = new HttpRequest('GET', '/api/users');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer valid-token');
    });
  });

  describe('función isExcluded', () => {
    const isExcluded = (urlWithParams: string, patterns: string[] | undefined): boolean => {
      if (!patterns || patterns.length === 0) return false;
      const u = urlWithParams.toLowerCase();
      return patterns.some(p => u.includes(String(p).toLowerCase()));
    };

    it('debe retornar false para patterns undefined', () => {
      expect(isExcluded('/api/test', undefined)).toBe(false);
    });

    it('debe retornar false para patterns vacío', () => {
      expect(isExcluded('/api/test', [])).toBe(false);
    });

    it('debe retornar true cuando URL contiene pattern', () => {
      expect(isExcluded('/api/auth/login', ['auth'])).toBe(true);
      expect(isExcluded('/api/users/login', ['login'])).toBe(true);
    });

    it('debe retornar false cuando URL no contiene pattern', () => {
      expect(isExcluded('/api/users/profile', ['auth'])).toBe(false);
      expect(isExcluded('/api/products', ['login'])).toBe(false);
    });

    it('debe ser case-insensitive', () => {
      expect(isExcluded('/API/AUTH/LOGIN', ['auth'])).toBe(true);
      expect(isExcluded('/api/auth/login', ['AUTH'])).toBe(true);
      expect(isExcluded('/API/AUTH/LOGIN', ['AUTH'])).toBe(true);
    });

    it('debe manejar múltiples patterns', () => {
      expect(isExcluded('/api/auth/login', ['auth', 'refresh'])).toBe(true);
      expect(isExcluded('/api/auth/refresh', ['auth', 'refresh'])).toBe(true);
      expect(isExcluded('/api/users/profile', ['auth', 'refresh'])).toBe(false);
    });

    it('debe manejar patterns no string', () => {
      expect(isExcluded('/api/test/123', [123 as any])).toBe(true);
      expect(isExcluded('/api/test/456', [123 as any])).toBe(false);
    });
  });

  describe('integración completa', () => {
    it('debe manejar el flujo completo exitoso', () => {
      const token = 'integration-test-token';
      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: ['auth'] }
      } as any);
      mockAuthTokenService.get.mockReturnValue(token);

      const req = new HttpRequest('GET', '/api/users/profile');
      const nextFn = jest.fn().mockReturnValue(
        of(
          new HttpResponse({
            status: 200,
            body: { userId: 123 }
          })
        )
      );

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));

      let response: any;
      obs$.subscribe(res => (response = res));

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(modifiedRequest.url).toBe('/api/users/profile');
      expect(response.status).toBe(200);
    });

    it('debe preservar request body y method', () => {
      const token = 'test-token';
      const requestBody = { name: 'Test User', email: 'test@example.com' };

      mockConfigStore.config.mockReturnValue({
        http: { addTokenJwt: true, excludeTokenJwt: [] }
      } as any);
      mockAuthTokenService.get.mockReturnValue(token);

      const req = new HttpRequest('POST', '/api/users', requestBody);
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 201 })));

      const obs$ = TestBed.runInInjectionContext(() => jwtAuthInterceptor(req, nextFn));
      obs$.subscribe();

      const modifiedRequest = nextFn.mock.calls[0][0];
      expect(modifiedRequest.method).toBe('POST');
      expect(modifiedRequest.body).toEqual(requestBody);
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
    });
  });
});
