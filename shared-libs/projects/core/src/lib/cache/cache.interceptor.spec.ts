import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { cacheInterceptor } from './cache.interceptor'; // ajusta si tu ruta real es distinta
import { AppConfigStore } from '../config/app-config.service';
import { CacheService } from './cache.service';

describe('cacheInterceptor (HttpInterceptorFn)', () => {
  // Mocks
  const mockStore = { config: jest.fn() };
  const mockCache: jest.Mocked<Pick<CacheService, 'get' | 'put'>> = {
    get: jest.fn(),
    put: jest.fn()
  };

  const cfgEnabled = (cacheableUrls: string[] = ['users']) => ({
    cache: { cache: true, cacheableUrls, maxAge: 60000 }
  });
  const cfgDisabled = {
    cache: { cache: false, cacheableUrls: ['users'], maxAge: 60000 }
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockStore },
        { provide: CacheService, useValue: mockCache }
      ]
    });
    jest.clearAllMocks();
  });

  const getReq = (url: string) => new HttpRequest('GET', url);
  const postReq = (url: string) => new HttpRequest('POST', url, null);
  const res = <T = any>(url: string, body: T, status = 200) =>
    new HttpResponse<T>({ url, status, body });

  it('ignora métodos no-GET (pasa tal cual)', done => {
    mockStore.config.mockReturnValue(cfgEnabled());

    const req = postReq('/api/users');
    const next = jest.fn().mockReturnValue(of(res('/api/users', { ok: 1 })));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: r => {
        expect(r).toBeInstanceOf(HttpResponse);
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('si cache=false, no usa CacheService y pasa tal cual', done => {
    mockStore.config.mockReturnValue(cfgDisabled);

    const req = getReq('/api/users?x=1');
    const next = jest.fn().mockReturnValue(of(res('/api/users?x=1', { ok: true })));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: () => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('si la URL no es cacheable (allow-list vacía) → pasa tal cual', done => {
    mockStore.config.mockReturnValue(cfgEnabled([])); // allow-list vacía => no cachea

    const req = getReq('/cualquier/url');
    const next = jest.fn().mockReturnValue(of(res('/cualquier/url', { ok: 1 })));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: () => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('si la URL no es cacheable (sin match) → pasa tal cual', done => {
    mockStore.config.mockReturnValue(cfgEnabled(['/api/orders'])); // sólo orders

    const req = getReq('/api/users?x=1'); // no contiene "/api/orders"
    const next = jest.fn().mockReturnValue(of(res('/api/users?x=1', { ok: 1 })));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: () => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('cache hit: devuelve clone() del HttpResponse (no llama next ni put)', done => {
    mockStore.config.mockReturnValue(cfgEnabled(['users']));

    const req = getReq('/api/users?limit=5');
    const cached = res('/api/users?limit=5', [{ id: 1 }]);
    mockCache.get.mockReturnValue(cached);

    const next = jest.fn(); // no debería llamarse

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: evt => {
        // estrechamos a HttpResponse para poder acceder a body
        expect(evt instanceof HttpResponse).toBe(true);
        const r = evt as HttpResponse<any>;
        expect(r).not.toBe(cached); // instancia distinta (clone)
        expect(r.body).toEqual(cached.body); // mismo contenido
        expect(next).not.toHaveBeenCalled();
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });

  it('cache miss: llama a next y guarda en caché cuando recibe HttpResponse', done => {
    mockStore.config.mockReturnValue(cfgEnabled(['users']));

    const req = getReq('/api/users?limit=10');
    mockCache.get.mockReturnValue(null);

    const network = res('/api/users?limit=10', [{ id: 7 }]);
    const next = jest.fn().mockReturnValue(of(network));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: r => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(r).toBe(network);
        expect(mockCache.put).toHaveBeenCalledTimes(1);
        expect(mockCache.put).toHaveBeenCalledWith(req, network);
        done();
      },
      error: done.fail
    });
  });

  it('case-insensitive: tokens y URL no distinguen mayúsculas', done => {
    mockStore.config.mockReturnValue(cfgEnabled(['USERS'])); // token en mayúsculas

    const req = getReq('/Api/Users?q=1'); // URL mixto
    mockCache.get.mockReturnValue(null);

    const resp = res('/Api/Users?q=1', { ok: 1 });
    const next = jest.fn().mockReturnValue(of(resp));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: () => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.get).toHaveBeenCalledWith(req);
        expect(mockCache.put).toHaveBeenCalledWith(req, resp);
        done();
      },
      error: done.fail
    });
  });

  it('si el evento no es HttpResponse, no hace put', done => {
    mockStore.config.mockReturnValue(cfgEnabled(['users']));

    const req = getReq('/api/users');
    mockCache.get.mockReturnValue(null);

    // Evento cualquiera que no sea instancia de HttpResponse
    const next = jest.fn().mockReturnValue(of({ type: 0 } as any));

    const obs$ = TestBed.runInInjectionContext(() => cacheInterceptor(req, next));
    obs$.subscribe({
      next: () => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCache.put).not.toHaveBeenCalled();
        done();
      },
      error: done.fail
    });
  });
});
