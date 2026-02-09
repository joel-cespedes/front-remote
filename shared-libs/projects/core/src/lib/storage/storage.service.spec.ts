import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { AppConfigStore } from '../config/app-config.service';
import { MemoryStorage } from './models/memory-storage';

// ========== helpers únicos (evitan TS2393) ==========
const __ls_originalDesc = Object.getOwnPropertyDescriptor(window, 'localStorage');

const __ls_restore = () => {
  if (__ls_originalDesc) {
    Object.defineProperty(window, 'localStorage', __ls_originalDesc);
  } else {
    delete (window as any).localStorage;
  }
};

const __ls_patch = (value: any) => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });
};

const __ls_createFake = (initial: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(initial));
  const fake: any = {
    getItem: jest.fn((k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, String(v));
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
    key: jest.fn((i: number) => Array.from(store.keys())[i] ?? null),
    get length() {
      return store.size;
    }
  };
  return { fake, store };
};

/**
 * Monta TestBed e instancia el servicio con el localStorage deseado.
 * @param withLs  true: localStorage OK; false: sin localStorage; 'throw': localStorage que lanza en sanity-check
 * @param clearAfterConstruct  si true, limpia los spies de localStorage justo después de crear el servicio (para no contar el sanity-check)
 */
const __setupLocal = (withLs: boolean | 'throw' = true, clearAfterConstruct = false) => {
  let fake: any | undefined;
  let store: Map<string, string> | undefined;

  if (withLs === true) {
    const r = __ls_createFake();
    fake = r.fake;
    store = r.store;
    __ls_patch(fake);
  } else if (withLs === 'throw') {
    const bad: any = {
      setItem: jest.fn(() => {
        throw new Error('quota or disabled');
      }),
      getItem: jest.fn(() => {
        throw new Error('unavailable');
      }),
      removeItem: jest.fn(() => {
        throw new Error('unavailable');
      }),
      clear: jest.fn(() => {
        throw new Error('unavailable');
      })
    };
    __ls_patch(bad);
    fake = bad;
  } else {
    __ls_patch(undefined);
  }

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [StorageService, { provide: AppConfigStore, useValue: __mockConfigStore }]
  });

  const service = TestBed.inject(StorageService);

  if (clearAfterConstruct && fake) {
    fake.setItem.mockClear();
    fake.getItem.mockClear();
    fake.removeItem.mockClear();
    fake.clear.mockClear();
  }

  return { service, fakeLocalStorage: fake, mapStore: store };
};
// ====================================================

const __mockConfigStore = { config: jest.fn() };

describe('StorageService', () => {
  beforeEach(() => {
    __mockConfigStore.config.mockReturnValue({
      appName: '  Mi Súper App  ' // ejercita normalizeNs
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    __ls_restore();
  });

  it('usa localStorage cuando está disponible y aplica namespace normalizado', () => {
    const { service, fakeLocalStorage } = __setupLocal(true, /*clearAfterConstruct*/ true);

    // ns esperado: "mi-súper-app"
    service.set('foo', { x: 1 });
    expect(fakeLocalStorage.setItem).toHaveBeenCalledTimes(1);

    const [keyArg, valArg] = fakeLocalStorage.setItem.mock.calls[0];
    expect(keyArg).toBe('mi-súper-app:foo');
    expect(valArg).toBe(JSON.stringify({ x: 1 }));

    const value = service.get<{ x: number }>('foo');
    expect(value).toEqual({ x: 1 });
  });

  it('get devuelve null si clave no existe', () => {
    const { service } = __setupLocal(true);
    expect(service.get('nope')).toBeNull();
  });

  it('get devuelve null si JSON inválido provoca excepción al parsear', () => {
    const { service, fakeLocalStorage } = __setupLocal(true);
    fakeLocalStorage.getItem.mockReturnValue('}{ invalid json');
    expect(service.get('k')).toBeNull();
  });

  it('has refleja existencia (true/false) según get()', () => {
    const { service } = __setupLocal(true);
    expect(service.has('a')).toBe(false);
    service.set('a', { ok: true });
    expect(service.has('a')).toBe(true);
    service.remove('a');
    expect(service.has('a')).toBe(false);
  });

  it('remove borra la clave namespaced', () => {
    const { service, mapStore } = __setupLocal(true, true);
    service.set('x', 123);
    expect(service.has('x')).toBe(true);
    service.remove('x');
    expect(service.has('x')).toBe(false);
    expect(mapStore!.size).toBe(0);
  });

  it('clear limpia el storage subyacente (borra TODO el storage, no solo el namespace)', () => {
    const { service, mapStore } = __setupLocal(true, true);
    service.set('a', 1);
    service.set('b', 2);
    expect(mapStore!.size).toBe(2);
    service.clear();
    expect(mapStore!.size).toBe(0);
    expect(service.has('a')).toBe(false);
    expect(service.has('b')).toBe(false);
  });

  it('no revienta si JSON.stringify falla en set (referencias circulares) y no escribe nada', () => {
    const { service, fakeLocalStorage } = __setupLocal(true, true);

    const a: any = {};
    a.self = a; // circular
    service.set('circular', a);

    // No debe llamarse setItem porque stringify lanza
    expect(fakeLocalStorage.setItem).not.toHaveBeenCalled();
    expect(service.get('circular')).toBeNull();
  });

  it('si localStorage lanza en sanity-check, cae a MemoryStorage', () => {
    const { service } = __setupLocal('throw');
    const internalStorage = (service as any).storage;
    expect(internalStorage).toBeInstanceOf(MemoryStorage);
    service.set('k', { v: 1 });
    expect(service.get('k')).toEqual({ v: 1 });
  });

  it('si no existe localStorage, usa MemoryStorage como fallback', () => {
    const { service } = __setupLocal(false);
    const internalStorage = (service as any).storage;
    expect(internalStorage).toBeInstanceOf(MemoryStorage);
    service.set('ns', 'ok');
    expect(service.get('ns')).toBe('ok');
  });

  it('respeta el namespace en todas las operaciones (set/get/remove) con localStorage', () => {
    const { service, fakeLocalStorage } = __setupLocal(true, true);

    service.set('k1', 42);
    service.get('k1');
    service.remove('k1');

    const allKeys = [
      ...fakeLocalStorage.setItem.mock.calls.map((c: any[]) => c[0]),
      ...fakeLocalStorage.getItem.mock.calls.map((c: any[]) => c[0]),
      ...fakeLocalStorage.removeItem.mock.calls.map((c: any[]) => c[0])
    ];

    for (const k of allKeys) {
      expect(k.startsWith('mi-súper-app:')).toBe(true);
    }
  });
});
