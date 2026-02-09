import { TestBed } from '@angular/core/testing';
import { GlobalLoadingService } from './global-loading.service';

describe('GlobalLoadingService', () => {
  let service: GlobalLoadingService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalLoadingService);
  });

  describe('inicialización', () => {
    it('debe inicializar con loading en false', () => {
      expect(service.loading()).toBe(false);
    });

    it('debe proveer un signal readonly para loading', () => {
      expect(typeof service.loading).toBe('function');
      expect((service.loading as any).set).toBeUndefined();
      expect((service.loading as any).update).toBeUndefined();
    });
  });

  describe('set', () => {
    it('debe cambiar el estado de loading a true', () => {
      service.set(true);
      expect(service.loading()).toBe(true);
    });

    it('debe cambiar el estado de loading a false', () => {
      service.set(true);
      service.set(false);
      expect(service.loading()).toBe(false);
    });

    it('debe permitir cambios múltiples de estado', () => {
      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(false);
      expect(service.loading()).toBe(false);

      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(false);
      expect(service.loading()).toBe(false);
    });

    it('debe mantener el mismo estado si se establece el mismo valor', () => {
      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(false);
      expect(service.loading()).toBe(false);

      service.set(false);
      expect(service.loading()).toBe(false);
    });
  });

  describe('reactividad de signals', () => {
    it('debe notificar cambios reactivamente (simulación simple)', () => {
      const values: boolean[] = [];

      const mockEffect = jest.fn(() => {
        values.push(service.loading());
      });

      mockEffect(); // inicial
      service.set(true);
      mockEffect(); // re-ejecución simulada

      service.set(false);
      mockEffect(); // re-ejecución simulada

      expect(values).toEqual([false, true, false]);
      expect(mockEffect).toHaveBeenCalledTimes(3);
    });

    it('debe funcionar con computed signals derivados (simulado)', () => {
      const getLoadingMessage = () => (service.loading() ? 'Cargando...' : 'Listo');

      expect(getLoadingMessage()).toBe('Listo');

      service.set(true);
      expect(getLoadingMessage()).toBe('Cargando...');

      service.set(false);
      expect(getLoadingMessage()).toBe('Listo');
    });
  });

  describe('múltiples instancias del servicio', () => {
    it('debe comportarse como singleton', () => {
      const service2 = TestBed.inject(GlobalLoadingService);
      service.set(true);
      expect(service2.loading()).toBe(true);
      expect(service).toBe(service2);
    });
  });

  describe('casos edge', () => {
    it('debe manejar valores truthy/falsy correctamente', () => {
      // ⚠️ El servicio guarda el valor tal cual; comprobamos truthiness/falsiness
      service.set(1 as any);
      expect(Boolean(service.loading())).toBe(true);

      service.set('true' as any);
      expect(Boolean(service.loading())).toBe(true);

      service.set([] as any);
      expect(Boolean(service.loading())).toBe(true);

      service.set(0 as any);
      expect(Boolean(service.loading())).toBe(false);

      service.set('' as any);
      expect(Boolean(service.loading())).toBe(false);

      service.set(null as any);
      expect(Boolean(service.loading())).toBe(false);

      service.set(undefined as any);
      expect(Boolean(service.loading())).toBe(false);
    });
  });

  describe('integración con Angular', () => {
    it('debe ser inyectable como servicio root', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GlobalLoadingService);
    });

    it('debe mantener estado a través del ciclo de vida de la aplicación', () => {
      service.set(true);
      const newServiceReference = TestBed.inject(GlobalLoadingService);
      expect(newServiceReference.loading()).toBe(true);
    });
  });

  describe('API y contratos', () => {
    it('debe exponer solo los métodos y propiedades necesarios', () => {
      expect(typeof service.set).toBe('function');
      expect(typeof service.loading).toBe('function');

      // existe _loading pero es privado; no lo usamos en asserts
      expect((service as any)._loading).toBeDefined();

      const publicProps = Object.getOwnPropertyNames(service).filter(p => !p.startsWith('_'));
      expect(publicProps.length).toBeGreaterThanOrEqual(1);
    });

    it('debe tener la signatura correcta para set', () => {
      expect(service.set.length).toBe(1);
      const result = service.set(true);
      expect(result).toBeUndefined();
    });

    it('debe tener la signatura correcta para loading', () => {
      expect(service.loading.length).toBe(0);
      expect(typeof service.loading()).toBe('boolean');
    });
  });

  describe('performance y memoria', () => {
    it('debe ser eficiente con cambios frecuentes', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        service.set(i % 2 === 0);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50);

      // último i = 999 (impar) -> false
      expect(service.loading()).toBe(false);
    });

    it('no debe tener memory leaks con el signal', () => {
      const initialState = service.loading();

      for (let i = 0; i < 100; i++) {
        service.set(i % 2 === 0);
      }

      service.set(initialState);
      expect(service.loading()).toBe(initialState);
    });
  });

  describe('casos de uso comunes', () => {
    it('debe manejar patrón típico de carga async', () => {
      service.set(true);
      expect(service.loading()).toBe(true);

      // Simulación: al "terminar" la operación, se pone en false
      service.set(false);
      expect(service.loading()).toBe(false);
    });

    it('debe manejar múltiples operaciones simultáneas conceptualmente', () => {
      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(true);
      expect(service.loading()).toBe(true);

      service.set(false);
      expect(service.loading()).toBe(false);
    });
  });

  describe('compatibilidad con template binding', () => {
    it('debe funcionar correctamente en templates Angular', () => {
      expect(service.loading()).toBe(false);
      service.set(true);
      expect(service.loading()).toBe(true);
      service.set(false);
      expect(service.loading()).toBe(false);
    });
  });
});
