import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse } from '@angular/common/http';

import { CacheService } from './cache.service'; // 👈 ajusta si tu ruta real es distinta
import { AppConfigStore } from '../config/app-config.service';

describe('CacheService', () => {
  const mockStore = { config: jest.fn() };

  let service: CacheService;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function setup(cfg: {
    cache: {
      cache: boolean;
      maxAge: number;
      cacheableUrls: string[];
    };
  }) {
    TestBed.resetTestingModule();
    mockStore.config.mockReturnValue(cfg);

    TestBed.configureTestingModule({
      providers: [CacheService, { provide: AppConfigStore, useValue: mockStore }]
    });

    service = TestBed.inject(CacheService);
    jest.clearAllMocks();
  }

  const enableCfg = {
    cache: { cache: true, maxAge: 60_000, cacheableUrls: ['users', '/api/orders'] }
  };
  const disableCfg = {
    cache: { cache: false, maxAge: 60_000, cacheableUrls: ['users'] }
  };

  const makeReq = (url: string) => new HttpRequest('GET', url);
  const makeRes = <T = unknown>(url: string, body: T, status = 200) =>
    new HttpResponse<T>({ url, status, body });

  it('no guarda ni recupera si cache=false', () => {
    setup(disableCfg);

    const req = makeReq('/api/users?x=1');
    const res = makeRes('/api/users?x=1', { ok: true });

    service.put(req, res);
    expect(service.get(req)).toBeNull();
  });

  it('guarda y recupera cuando cache=true y URL está permitida (token parcial)', () => {
    setup(enableCfg);

    const req = makeReq('/v1/users?limit=5');
    const res = makeRes('/v1/users?limit=5', [{ id: 1 }]);

    service.put(req, res);
    const got = service.get(req);

    expect(got).toBeInstanceOf(HttpResponse);
    expect(got).toEqual(res);
  });

  it('no cachea si la URL no está en la allow-list', () => {
    setup({ cache: { cache: true, maxAge: 60_000, cacheableUrls: ['/api/orders'] } });

    const req = makeReq('/api/users?x=1'); // "users" no está permitido
    const res = makeRes('/api/users?x=1', { ok: 1 });
    service.put(req, res);

    expect(service.get(req)).toBeNull();
  });

  it('coincidencia es case-insensitive (tokens y URL)', () => {
    setup({ cache: { cache: true, maxAge: 60_000, cacheableUrls: ['USERS'] } });

    const req = makeReq('/API/Users?Q=1');
    const res = makeRes('/API/Users?Q=1', { ok: true });

    service.put(req, res);
    expect(service.get(req)).toEqual(res);
  });

  it('expira entradas cuando (Date.now - t) > maxAge y las elimina del mapa', () => {
    setup({ cache: { cache: true, maxAge: 5_000, cacheableUrls: ['users'] } });

    const t0 = new Date('2024-01-01T00:00:00Z');
    jest.setSystemTime(t0);

    const req = makeReq('/api/users?p=1');
    const res = makeRes('/api/users?p=1', { page: 1 });

    service.put(req, res);
    // Dentro de maxAge
    jest.setSystemTime(new Date(t0.getTime() + 4_000));
    expect(service.get(req)).toEqual(res);

    // Fuera de maxAge -> debería expirar y borrar
    jest.setSystemTime(new Date(t0.getTime() + 6_000));
    expect(service.get(req)).toBeNull();

    // Incluso si intentamos otra vez, ya fue eliminado
    expect(service.get(req)).toBeNull();
  });

  it('invalidateUrl() elimina solo la clave exacta', () => {
    setup(enableCfg);

    const req1 = makeReq('/api/users?p=1');
    const res1 = makeRes('/api/users?p=1', { page: 1 });

    const req2 = makeReq('/api/orders?id=10');
    const res2 = makeRes('/api/orders?id=10', { id: 10 });

    service.put(req1, res1);
    service.put(req2, res2);

    // invalida users
    service.invalidateUrl('/api/users?p=1');

    expect(service.get(req1)).toBeNull();
    expect(service.get(req2)).toEqual(res2);
  });

  it('invalidateByPrefix() elimina todas las entradas cuyo key empieza por el prefijo', () => {
    setup(enableCfg);

    const reqA = makeReq('/api/users');
    const resA = makeRes('/api/users', { a: 1 });

    const reqB = makeReq('/api/users/1?x=1');
    const resB = makeRes('/api/users/1?x=1', { b: 2 });

    const reqC = makeReq('/api/orders?o=1');
    const resC = makeRes('/api/orders?o=1', { c: 3 });

    service.put(reqA, resA);
    service.put(reqB, resB);
    service.put(reqC, resC);

    service.invalidateByPrefix('/api/users');

    expect(service.get(reqA)).toBeNull();
    expect(service.get(reqB)).toBeNull();
    expect(service.get(reqC)).toEqual(resC);
  });

  it('clear() elimina todo el contenido del caché', () => {
    setup(enableCfg);

    const req1 = makeReq('/v1/users');
    const res1 = makeRes('/v1/users', {});

    const req2 = makeReq('/api/orders?z=1');
    const res2 = makeRes('/api/orders?z=1', {});

    service.put(req1, res1);
    service.put(req2, res2);

    service.clear();

    expect(service.get(req1)).toBeNull();
    expect(service.get(req2)).toBeNull();
  });

  it('con allow-list vacía no cachea nada aunque cache=true', () => {
    setup({ cache: { cache: true, maxAge: 60_000, cacheableUrls: [] } });

    const req = makeReq('/any/url');
    const res = makeRes('/any/url', { ok: 1 });

    service.put(req, res);
    expect(service.get(req)).toBeNull();
  });
});
