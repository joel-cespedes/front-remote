import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService, FlagMap } from './feature-flags.service';
import { AppConfigStore } from '../config/app-config.service';

describe('FeatureFlagsService', () => {
  /**
   * Crea un servicio nuevo por test, con un mock de AppConfigStore.config()
   * @param cfgImpl implementación a usar para config() (puede devolver objeto o lanzar)
   */
  function createService(cfgImpl: () => any) {
    const mockStore = { config: jest.fn(cfgImpl) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [FeatureFlagsService, { provide: AppConfigStore, useValue: mockStore }]
    });

    const svc = TestBed.inject(FeatureFlagsService);
    return { svc, mockStore };
  }

  it('inicializa desde config().featureFlags cuando existe', () => {
    const initial: FlagMap = { a: true, b: false };
    const { svc } = createService(() => ({ featureFlags: initial }));

    expect(svc.all()).toEqual(initial);
    // Signal computed
    expect((svc as any).flags()).toEqual(initial);
    expect(svc.isOn('a')).toBe(true);
    expect(svc.isOff('b')).toBe(true);
    expect(svc.isOn('c')).toBe(false);
  });

  it('si config() lanza en el constructor, arranca con flags vacíos', () => {
    const { svc } = createService(() => {
      throw new Error('AppConfig not loaded');
    });

    expect(svc.all()).toEqual({});
    expect((svc as any).flags()).toEqual({});
    expect(svc.isOn('x')).toBe(false);
    expect(svc.isOff('x')).toBe(true);
  });

  describe('set()', () => {
    it('establece nuevos valores creando nuevo estado', () => {
      const { svc } = createService(() => ({ featureFlags: { a: false } }));

      const before = (svc as any).flags();
      expect(before).toEqual({ a: false });

      svc.set('a', true);
      const after = (svc as any).flags();

      expect(after).toEqual({ a: true });
      expect(after).not.toBe(before); // referencia distinta
      expect(svc.isOn('a')).toBe(true);
    });

    it('no hace nada si el valor es el mismo (mantiene la referencia)', () => {
      const { svc } = createService(() => ({ featureFlags: { a: true, b: false } }));

      const state1 = (svc as any).flags();
      svc.set('a', true); // mismo valor
      svc.set('b', false); // mismo valor
      const state2 = (svc as any).flags();

      expect(state2).toBe(state1); // misma referencia => no-op
      expect(state2).toEqual({ a: true, b: false });
    });
  });

  describe('toggle()', () => {
    it('invierte el valor existente', () => {
      const { svc } = createService(() => ({ featureFlags: { a: true, b: false } }));

      svc.toggle('a'); // true -> false
      expect(svc.isOn('a')).toBe(false);
      expect((svc as any).flags()).toEqual({ a: false, b: false });

      svc.toggle('b'); // false -> true
      expect(svc.isOn('b')).toBe(true);
      expect((svc as any).flags()).toEqual({ a: false, b: true });
    });

    it('si la clave no existe, la pone a true', () => {
      const { svc } = createService(() => ({ featureFlags: {} }));

      svc.toggle('newFlag'); // undefined -> true
      expect(svc.isOn('newFlag')).toBe(true);
      expect((svc as any).flags()).toEqual({ newFlag: true });
    });
  });

  describe('load()', () => {
    it('reemplaza el mapa completo', () => {
      const { svc } = createService(() => ({ featureFlags: { a: true } }));

      const first = (svc as any).flags();
      expect(first).toEqual({ a: true });

      svc.load({ x: false, y: true });
      const second = (svc as any).flags();

      expect(second).toEqual({ x: false, y: true });
      expect(second).not.toBe(first); // referencia distinta
      expect(svc.isOn('a')).toBe(false);
      expect(svc.isOn('y')).toBe(true);
    });
  });

  describe('all() y flags()', () => {
    it('devuelven el estado actual', () => {
      const { svc } = createService(() => ({ featureFlags: { a: true } }));
      expect(svc.all()).toEqual({ a: true });
      expect((svc as any).flags()).toEqual({ a: true });

      svc.set('b', false);
      expect(svc.all()).toEqual({ a: true, b: false });
      expect((svc as any).flags()).toEqual({ a: true, b: false });
    });
  });

  describe('isOn / isOff', () => {
    it('coherentes entre sí', () => {
      const { svc } = createService(() => ({ featureFlags: { f1: true, f2: false } }));

      expect(svc.isOn('f1')).toBe(true);
      expect(svc.isOff('f1')).toBe(false);

      expect(svc.isOn('f2')).toBe(false);
      expect(svc.isOff('f2')).toBe(true);

      expect(svc.isOn('unknown')).toBe(false);
      expect(svc.isOff('unknown')).toBe(true);
    });
  });
  it('si config() no tiene featureFlags, arranca con flags vacíos', () => {
    const { svc } = createService(() => ({})); // config() OK pero sin featureFlags
    expect(svc.all()).toEqual({});
    expect((svc as any).flags()).toEqual({});
    expect(svc.isOn('algo')).toBe(false);
  });
});
