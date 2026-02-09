import { Injector, InjectionToken } from '@angular/core';
// ⬇️ Ajusta esta ruta al archivo real
import { InjectorHolder } from './injector-holder';

class FooService {
  name = 'foo';
}
class BarService {
  name = 'bar';
}

interface Config {
  api: string;
  feature?: boolean;
}
const CONFIG = new InjectionToken<Config>('CONFIG_TOKEN');

describe('InjectorHolder', () => {
  afterEach(() => {
    // Limpieza: resetea el estado estático entre tests
    (InjectorHolder as any).inj = null;
  });

  it('lanza si get() se llama antes de set()', () => {
    expect(() => InjectorHolder.get(FooService)).toThrow('InjectorHolder not set yet');
  });

  it('resuelve un provider por Type después de set()', () => {
    const injector = Injector.create({
      providers: [{ provide: FooService, useClass: FooService }]
    });

    InjectorHolder.set(injector);

    const foo = InjectorHolder.get(FooService);
    expect(foo).toBeInstanceOf(FooService);
    expect(foo.name).toBe('foo');
  });

  it('resuelve un provider por InjectionToken después de set()', () => {
    const cfg: Config = { api: '/v1', feature: true };

    const injector = Injector.create({
      providers: [{ provide: CONFIG, useValue: cfg }]
    });

    InjectorHolder.set(injector);

    const got = InjectorHolder.get(CONFIG);
    expect(got).toBe(cfg); // misma referencia
    expect(got.api).toBe('/v1');
    expect(got.feature).toBe(true);
  });

  it('permite sobrescribir el injector (último set() gana)', () => {
    const injector1 = Injector.create({
      providers: [
        { provide: FooService, useValue: { name: 'foo#1' } as FooService },
        { provide: CONFIG, useValue: { api: '/v1' } as Config }
      ]
    });

    const injector2 = Injector.create({
      providers: [
        { provide: FooService, useValue: { name: 'foo#2' } as FooService },
        { provide: CONFIG, useValue: { api: '/v2', feature: true } as Config }
      ]
    });

    InjectorHolder.set(injector1);
    expect(InjectorHolder.get(FooService).name).toBe('foo#1');
    expect(InjectorHolder.get(CONFIG).api).toBe('/v1');

    InjectorHolder.set(injector2);
    expect(InjectorHolder.get(FooService).name).toBe('foo#2');
    expect(InjectorHolder.get(CONFIG).api).toBe('/v2');
    expect(InjectorHolder.get(CONFIG).feature).toBe(true);
  });

  it('propaga el error del injector cuando el token no existe (NullInjectorError)', () => {
    const injector = Injector.create({
      providers: [{ provide: FooService, useClass: FooService }]
    });
    InjectorHolder.set(injector);

    // BarService no está en providers -> debe lanzar (NullInjectorError interno)
    expect(() => InjectorHolder.get(BarService)).toThrow();
  });
});
