import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Service, __test__ } from './service'; // ⬅️ import de helpers internos
import { AppConfigStore } from '../config/app-config.service';
import { AppConfig } from '../config/models/app-config.types';

// Mock de datos para tests
interface TestEntity {
  id: number;
  name: string;
  email?: string;
}

// Implementación concreta para testing
class TestService extends Service<TestEntity, TestEntity[]> {
  constructor(moduleName?: string, urlOverride?: string) {
    super(moduleName, urlOverride);
  }
}

describe('Service', () => {
  let service: TestService;
  let httpTesting: HttpTestingController;
  let mockConfigStore: jest.Mocked<AppConfigStore>;

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
    cache: { cache: true, maxAge: 300000, cacheableUrls: [] },
    trace: { audit: true, auditHost: 'https://audit.example.com' },
    logger: { loggers: false, loggersHost: '' },
    errors: {
      httpErrors: true,
      httpErrorsHost: '',
      jsErrors: true,
      jsErrorsHost: ''
    },
    apiModules: [
      { name: 'users', baseUrl: 'https://api.example.com', path: '/users' },
      { name: 'products', baseUrl: 'https://api.example.com', path: '/products' },
      { name: 'orders', baseUrl: 'https://different-api.com', path: '/v2/orders' }
    ]
  };

  beforeEach(() => {
    mockConfigStore = {
      config: jest.fn().mockReturnValue(mockConfig),
      ready: jest.fn().mockReturnValue(true)
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigStore, useValue: mockConfigStore }
      ]
    });

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('constructor', () => {
    it('debe resolver URL desde config cuando se proporciona moduleName', () => {
      service = TestBed.runInInjectionContext(() => new TestService('users'));
      expect((service as any).baseUrl).toBe('https://api.example.com/users');
    });

    it('debe usar urlOverride cuando se proporciona', () => {
      service = TestBed.runInInjectionContext(
        () => new TestService('users', 'https://custom-api.com/api')
      );
      expect((service as any).baseUrl).toBe('https://custom-api.com/api');
    });

    it('debe priorizar urlOverride sobre moduleName', () => {
      service = TestBed.runInInjectionContext(
        () => new TestService('users', 'https://override.com/api')
      );
      expect((service as any).baseUrl).toBe('https://override.com/api');
    });

    it('debe ser case-insensitive para moduleName', () => {
      service = TestBed.runInInjectionContext(() => new TestService('USERS'));
      expect((service as any).baseUrl).toBe('https://api.example.com/users');
    });

    it('debe lanzar error cuando moduleName no existe en config', () => {
      expect(() => {
        TestBed.runInInjectionContext(() => new TestService('nonexistent'));
      }).toThrow("The method 'nonexistent' does not exist in the configuration file.");
    });

    it('debe lanzar error cuando no hay moduleName ni urlOverride', () => {
      expect(() => {
        TestBed.runInInjectionContext(() => new TestService());
      }).toThrow("You need a valid URL to extend this service for 'unknown'");
    });

    // ✅ Cubre: if (!app) throw new Error('App config not loaded yet')
    it('debe lanzar "App config not loaded yet" si AppConfigStore.config() devuelve undefined', () => {
      mockConfigStore.config.mockReturnValue(undefined as any);

      expect(() => {
        TestBed.runInInjectionContext(() => new TestService('users'));
      }).toThrow('App config not loaded yet');
    });

    it('debe lanzar error específico cuando AppConfigStore lanza error personalizado', () => {
      mockConfigStore.config.mockImplementation(() => {
        throw new Error('Custom config error');
      });

      expect(() => {
        TestBed.runInInjectionContext(() => new TestService('users'));
      }).toThrow('Custom config error');
    });
  });

  describe('métodos HTTP', () => {
    beforeEach(() => {
      service = TestBed.runInInjectionContext(() => new TestService('users'));
    });

    describe('list()', () => {
      it('debe hacer GET request sin parámetros', () => {
        const mockData: TestEntity[] = [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' }
        ];

        service.list().subscribe(data => {
          expect(data).toEqual(mockData);
        });

        const req = httpTesting.expectOne('https://api.example.com/users');
        expect(req.request.method).toBe('GET');
        expect(req.request.params.keys()).toHaveLength(0);

        req.flush(mockData);
      });

      it('debe hacer GET request con parámetros', () => {
        const queryParams = { active: true, limit: 10, search: 'john' };

        service.list(queryParams).subscribe();

        const req = httpTesting.expectOne(
          request =>
            request.url === 'https://api.example.com/users' &&
            request.params.get('active') === 'true' &&
            request.params.get('limit') === '10' &&
            request.params.get('search') === 'john'
        );
        expect(req.request.method).toBe('GET');

        req.flush([]);
      });

      it('debe hacer GET request con parámetros que incluyen arrays', () => {
        const queryParams: any = {
          tags: ['javascript', 'typescript'],
          ids: [1, 2, 3],
          active: true
        };

        service.list(queryParams).subscribe();

        const req = httpTesting.expectOne(request => {
          const tagsLength = request.params.getAll('tags')?.length || 0;
          const idsLength = request.params.getAll('ids')?.length || 0;
          const activeParam = request.params.get('active');

          return (
            request.url === 'https://api.example.com/users' &&
            tagsLength === 2 &&
            idsLength === 3 &&
            activeParam === 'true'
          );
        });
        expect(req.request.method).toBe('GET');

        const tagsResult = req.request.params.getAll('tags');
        const idsResult = req.request.params.getAll('ids');

        expect(tagsResult).toEqual(['javascript', 'typescript']);
        expect(idsResult).toEqual(['1', '2', '3']);

        req.flush([]);
      });

      it('debe ignorar parámetros null, undefined y vacíos', () => {
        const queryParams = {
          active: true,
          search: null,
          filter: undefined,
          category: ''
        };

        service.list(queryParams).subscribe();

        const req = httpTesting.expectOne(
          request =>
            request.url === 'https://api.example.com/users' &&
            request.params.get('active') === 'true' &&
            request.params.get('search') === null &&
            request.params.get('filter') === null &&
            request.params.get('category') === null
        );
        expect(req.request.method).toBe('GET');

        req.flush([]);
      });
    });

    describe('getBy()', () => {
      it('debe hacer GET request por ID numérico', () => {
        const mockData: TestEntity = { id: 1, name: 'John', email: 'john@example.com' };

        service.getBy(1).subscribe(data => {
          expect(data).toEqual(mockData);
        });

        const req = httpTesting.expectOne('https://api.example.com/users/1');
        expect(req.request.method).toBe('GET');

        req.flush(mockData);
      });

      it('debe hacer GET request por ID string', () => {
        const mockData: TestEntity = { id: 1, name: 'John', email: 'john@example.com' };

        service.getBy('abc-123').subscribe(data => {
          expect(data).toEqual(mockData);
        });

        const req = httpTesting.expectOne('https://api.example.com/users/abc-123');
        expect(req.request.method).toBe('GET');

        req.flush(mockData);
      });

      it('debe encodear IDs con caracteres especiales', () => {
        service.getBy('user@domain.com').subscribe();

        const req = httpTesting.expectOne('https://api.example.com/users/user%40domain.com');
        expect(req.request.method).toBe('GET');

        req.flush({});
      });

      it('debe incluir parámetros de query cuando se proporcionan', () => {
        const queryParams = { include: 'profile', expand: true };

        service.getBy(1, queryParams).subscribe();

        const req = httpTesting.expectOne(
          request =>
            request.url === 'https://api.example.com/users/1' &&
            request.params.get('include') === 'profile' &&
            request.params.get('expand') === 'true'
        );
        expect(req.request.method).toBe('GET');

        req.flush({});
      });
    });

    describe('create()', () => {
      it('debe hacer POST request con datos', () => {
        const newUser: Partial<TestEntity> = { name: 'New User', email: 'new@example.com' };
        const createdUser: TestEntity = { id: 3, name: 'New User', email: 'new@example.com' };

        service.create(newUser).subscribe(data => {
          expect(data).toEqual(createdUser);
        });

        const req = httpTesting.expectOne('https://api.example.com/users');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(newUser);

        req.flush(createdUser);
      });

      it('debe manejar datos parciales', () => {
        const partialUser: Partial<TestEntity> = { name: 'Partial User' };

        service.create(partialUser).subscribe();

        const req = httpTesting.expectOne('https://api.example.com/users');
        expect(req.request.body).toEqual(partialUser);

        req.flush({ id: 4, name: 'Partial User' });
      });
    });

    describe('update()', () => {
      it('debe hacer PUT request con datos completos', () => {
        const updatedUser: TestEntity = {
          id: 1,
          name: 'Updated User',
          email: 'updated@example.com'
        };

        service.update(1, updatedUser).subscribe(data => {
          expect(data).toEqual(updatedUser);
        });

        const req = httpTesting.expectOne('https://api.example.com/users/1');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(updatedUser);

        req.flush(updatedUser);
      });

      it('debe encodear IDs en la URL', () => {
        const user: TestEntity = { id: 1, name: 'User', email: 'user@example.com' };

        service.update('user@domain.com', user).subscribe();

        const req = httpTesting.expectOne('https://api.example.com/users/user%40domain.com');
        expect(req.request.method).toBe('PUT');

        req.flush(user);
      });
    });

    describe('patch()', () => {
      it('debe hacer PATCH request con datos parciales', () => {
        const patchData: Partial<TestEntity> = { name: 'Patched Name' };
        const patchedUser: TestEntity = {
          id: 1,
          name: 'Patched Name',
          email: 'original@example.com'
        };

        service.patch(1, patchData).subscribe(data => {
          expect(data).toEqual(patchedUser);
        });

        const req = httpTesting.expectOne('https://api.example.com/users/1');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(patchData);

        req.flush(patchedUser);
      });
    });

    describe('delete()', () => {
      it('debe hacer DELETE request', () => {
        service.delete(1).subscribe();

        const req = httpTesting.expectOne('https://api.example.com/users/1');
        expect(req.request.method).toBe('DELETE');
        expect(req.request.body).toBeNull();

        req.flush(null);
      });

      it('debe encodear IDs en la URL para delete', () => {
        service.delete('user@domain.com').subscribe();

        const req = httpTesting.expectOne('https://api.example.com/users/user%40domain.com');
        expect(req.request.method).toBe('DELETE');

        req.flush(null);
      });
    });
  });

  describe('funciones helper (reales del módulo)', () => {
    // ✅ Cubre: if (!params) return hp;
    it('toHttpParams(undefined) retorna HttpParams vacío (cubre guard)', () => {
      const hp = __test__.toHttpParams(undefined as any);
      expect(hp).toBeInstanceOf(HttpParams);
      expect(hp.keys()).toHaveLength(0);
    });

    it('toHttpParams convierte valores básicos y arrays', () => {
      const hp = __test__.toHttpParams({
        a: 'x',
        b: 1,
        c: true,
        arr: ['u', 2]
      } as any);
      expect(hp.get('a')).toBe('x');
      expect(hp.get('b')).toBe('1');
      expect(hp.get('c')).toBe('true');
      expect(hp.getAll('arr')).toEqual(['u', '2']);
    });

    it('joinUrl une correctamente base y path con slashes', () => {
      expect(__test__.joinUrl('https://api.com///', '///users')).toBe('https://api.com/users');
    });
  });

  describe('resolveBaseUrl', () => {
    beforeEach(() => {
      service = TestBed.runInInjectionContext(() => new TestService('users'));
    });

    it('debe encontrar módulo exacto en config', () => {
      const result = (service as any).resolveBaseUrl('products');
      expect(result).toBe('https://api.example.com/products');
    });

    it('debe funcionar con diferentes baseUrls', () => {
      const result = (service as any).resolveBaseUrl('orders');
      expect(result).toBe('https://different-api.com/v2/orders');
    });

    it('debe ser case-insensitive', () => {
      const result = (service as any).resolveBaseUrl('PRODUCTS');
      expect(result).toBe('https://api.example.com/products');
    });

    it('debe lanzar error para módulo inexistente', () => {
      expect(() => {
        (service as any).resolveBaseUrl('nonexistent');
      }).toThrow("The method 'nonexistent' does not exist in the configuration file.");
    });

    it('debe retornar string vacío para moduleName undefined', () => {
      const result = (service as any).resolveBaseUrl(undefined);
      expect(result).toBe('');
    });
  });

  describe('integración completa', () => {
    it('debe funcionar con diferentes módulos de API', () => {
      const productService = TestBed.runInInjectionContext(() => new TestService('products'));

      productService.list().subscribe();
      const req = httpTesting.expectOne('https://api.example.com/products');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('debe manejar el flujo CRUD completo', () => {
      service = TestBed.runInInjectionContext(() => new TestService('users'));

      // Create
      const newUser = { name: 'Test User', email: 'test@example.com' };
      service.create(newUser).subscribe();

      let req = httpTesting.expectOne('https://api.example.com/users');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 1, ...newUser });

      // Read
      service.getBy(1).subscribe();

      req = httpTesting.expectOne('https://api.example.com/users/1');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 1, ...newUser });

      // Update
      const updatedUser = { id: 1, name: 'Updated User', email: 'updated@example.com' };
      service.update(1, updatedUser).subscribe();

      req = httpTesting.expectOne('https://api.example.com/users/1');
      expect(req.request.method).toBe('PUT');
      req.flush(updatedUser);

      // Delete
      service.delete(1).subscribe();

      req = httpTesting.expectOne('https://api.example.com/users/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
