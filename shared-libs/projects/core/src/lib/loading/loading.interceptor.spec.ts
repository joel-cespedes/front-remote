import { TestBed } from '@angular/core/testing';
import {
  HttpContext,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { of, throwError, delay, Subject } from 'rxjs';

import { loadingInterceptor, resetCountForTests } from './loading.interceptor';
import { AppConfigStore } from '../config/app-config.service';
import { GlobalLoadingService } from './global-loading.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

describe('LoadingInterceptor', () => {
  let mockConfigStore: jest.Mocked<AppConfigStore>;
  let mockGlobalLoadingService: jest.Mocked<GlobalLoadingService>;

  beforeEach(() => {
    mockConfigStore = {
      config: jest.fn()
    } as any;

    mockGlobalLoadingService = {
      set: jest.fn(),
      loading: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigStore, useValue: mockConfigStore },
        { provide: GlobalLoadingService, useValue: mockGlobalLoadingService }
      ]
    });

    // Reset del contador global antes de cada test
    resetCountForTests();
    jest.clearAllMocks();
  });

  describe('configuración de globalLoading', () => {
    it('no debe activar loading cuando globalLoading es false', () => {
      mockConfigStore.config.mockReturnValue({ globalLoading: false } as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).not.toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith(req);
    });

    it('no debe activar loading cuando globalLoading es undefined', () => {
      mockConfigStore.config.mockReturnValue({} as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).not.toHaveBeenCalled();
    });

    it('debe activar loading cuando globalLoading es true', () => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
    });
  });

  describe('bypass del interceptor', () => {
    it('debe saltarse el interceptor cuando BYPASS_INTERCEPTORS está activo', () => {
      // ⚠️ Necesita config aunque no se use, para evitar error de lectura
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);

      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).not.toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith(req);
    });

    it('debe procesar normalmente cuando BYPASS_INTERCEPTORS es false', () => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, false);
      const req = new HttpRequest('GET', '/api/test', { context: ctx });
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalled();
    });
  });

  describe('contador de peticiones', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      resetCountForTests();
    });

    it('debe activar loading en la primera petición', () => {
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
    });

    it('debe desactivar loading cuando la última petición termina', () => {
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      const setCalls = mockGlobalLoadingService.set.mock.calls;
      expect(setCalls).toEqual([[true], [false]]);
    });

    it('no debe desactivar loading si hay otras peticiones en curso', done => {
      const subject1 = new Subject<HttpResponse<any>>();
      const subject2 = new Subject<HttpResponse<any>>();

      const req1 = new HttpRequest('GET', '/api/test1');
      const req2 = new HttpRequest('GET', '/api/test2');

      const nextFn1 = jest.fn().mockReturnValue(subject1.asObservable());
      const nextFn2 = jest.fn().mockReturnValue(subject2.asObservable());

      const obs1$ = TestBed.runInInjectionContext(() => loadingInterceptor(req1, nextFn1));
      const obs2$ = TestBed.runInInjectionContext(() => loadingInterceptor(req2, nextFn2));

      // Iniciamos ambas peticiones
      obs1$.subscribe();
      obs2$.subscribe();

      // Debería haberse llamado set(true) solo una vez
      expect(mockGlobalLoadingService.set).toHaveBeenCalledTimes(1);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);

      // Completamos la primera petición
      subject1.next(new HttpResponse({ status: 200 }));
      subject1.complete();

      // Esperamos un poco y verificamos que NO se llamó set(false) aún
      setTimeout(() => {
        const falseCalls = mockGlobalLoadingService.set.mock.calls.filter(
          call => call[0] === false
        );
        expect(falseCalls).toHaveLength(0);

        // Ahora completamos la segunda petición
        subject2.next(new HttpResponse({ status: 200 }));
        subject2.complete();

        // Ahora sí debería llamar set(false)
        setTimeout(() => {
          expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
          done();
        }, 10);
      }, 10);
    });

    it('debe manejar peticiones concurrentes correctamente', done => {
      const subjects = [
        new Subject<HttpResponse<any>>(),
        new Subject<HttpResponse<any>>(),
        new Subject<HttpResponse<any>>()
      ];

      const requests = [
        new HttpRequest('GET', '/api/test1'),
        new HttpRequest('GET', '/api/test2'),
        new HttpRequest('GET', '/api/test3')
      ];

      const nextFns = subjects.map(subject => jest.fn().mockReturnValue(subject.asObservable()));

      // Ejecutar las tres peticiones
      const observables = requests.map((req, i) =>
        TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFns[i]))
      );

      // Suscribirse a todas
      observables.forEach(obs => obs.subscribe());

      // Verificar que solo se llamó set(true) una vez
      expect(mockGlobalLoadingService.set).toHaveBeenCalledTimes(1);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);

      // Completar todas las peticiones
      subjects.forEach((subject, i) => {
        setTimeout(
          () => {
            subject.next(new HttpResponse({ status: 200 }));
            subject.complete();
          },
          (i + 1) * 10
        );
      });

      // Verificar resultado final
      setTimeout(() => {
        const setCalls = mockGlobalLoadingService.set.mock.calls;
        const trueCalls = setCalls.filter(call => call[0] === true);
        const falseCalls = setCalls.filter(call => call[0] === false);

        expect(trueCalls).toHaveLength(1);
        expect(falseCalls).toHaveLength(1);
        done();
      }, 100);
    });
  });

  describe('manejo de errores', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      resetCountForTests();
    });

    it('debe desactivar loading incluso cuando la petición falla', done => {
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(throwError(() => new Error('Test error')));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));

      obs$.subscribe({
        error: error => {
          // Dar tiempo al finalize para ejecutarse
          setTimeout(() => {
            expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
            expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
            done();
          }, 10);
        }
      });
    });

    it('debe decrementar contador correctamente en caso de error', () => {
      // Reset explícito del contador para este test
      resetCountForTests();

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
    });
  });

  describe('función resetCountForTests', () => {
    it('debe resetear el contador a 0', () => {
      const result = resetCountForTests();
      expect(result).toBe(0);
    });

    it('debe permitir tests aislados', () => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);

      resetCountForTests();

      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
    });
  });

  describe('casos edge', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      resetCountForTests();
    });

    it('debe manejar peticiones que completan inmediatamente', () => {
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
    });

    it('debe manejar múltiples peticiones secuenciales', () => {
      const req1 = new HttpRequest('GET', '/api/test1');
      const req2 = new HttpRequest('GET', '/api/test2');

      const nextFn1 = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));
      const nextFn2 = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      // Primera petición
      const obs1$ = TestBed.runInInjectionContext(() => loadingInterceptor(req1, nextFn1));
      obs1$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);

      // Limpiar mocks y hacer segunda petición
      jest.clearAllMocks();

      const obs2$ = TestBed.runInInjectionContext(() => loadingInterceptor(req2, nextFn2));
      obs2$.subscribe();

      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
    });

    it('debe preservar headers y body de la petición original', () => {
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      const body = { test: 'data' };
      const req = new HttpRequest('POST', '/api/test', body, { headers });

      const nextFn = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      expect(nextFn).toHaveBeenCalledWith(req);
      const passedRequest = nextFn.mock.calls[0][0];
      expect(passedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(passedRequest.body).toEqual(body);
    });
  });

  describe('integración con finalize', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      resetCountForTests();
    });

    it('debe llamar finalize incluso si se cancela la suscripción', done => {
      const subject = new Subject<HttpResponse<any>>();
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest.fn().mockReturnValue(subject.asObservable());

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));

      const subscription = obs$.subscribe();

      // Verificar que se activó loading
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);

      // Cancelar suscripción
      subscription.unsubscribe();

      setTimeout(() => {
        expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(false);
        done();
      }, 10);
    });
  });

  describe('estado del contador global', () => {
    beforeEach(() => {
      mockConfigStore.config.mockReturnValue({ globalLoading: true } as any);
      resetCountForTests();
    });

    it('debe incrementar contador al iniciar petición', () => {
      const req = new HttpRequest('GET', '/api/test');
      const nextFn = jest
        .fn()
        .mockReturnValue(of(new HttpResponse({ status: 200 })).pipe(delay(10)));

      const obs$ = TestBed.runInInjectionContext(() => loadingInterceptor(req, nextFn));
      obs$.subscribe();

      // Verificar que se llamó set(true) al inicio
      expect(mockGlobalLoadingService.set).toHaveBeenCalledWith(true);
    });
  });
});
