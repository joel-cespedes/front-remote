import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FeatureFlagDirective } from './feature-flag.directive';
import { FeatureFlagsService } from './feature-flags.service';

// Hosts standalone e importan la directiva
@Component({
  standalone: true,
  imports: [FeatureFlagDirective],
  template: `
    <div id="tgt" [ff]="flag" [ffNot]="invert"></div>
  `
})
class HostBoundComponent {
  flag: string | boolean | null = null;
  invert = false;
}

@Component({
  standalone: true,
  imports: [FeatureFlagDirective],
  template: `
    <div id="tgt" ffNot></div>
  `
})
class HostAttrOnlyNotComponent {}

describe('FeatureFlagDirective', () => {
  const mockSvc: jest.Mocked<Pick<FeatureFlagsService, 'isOn'>> = {
    isOn: jest.fn<boolean, [string]>()
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HostBoundComponent, HostAttrOnlyNotComponent],
      providers: [{ provide: FeatureFlagsService, useValue: mockSvc }]
    });
    jest.clearAllMocks();
  });

  const getEl = (fx: any): HTMLElement =>
    fx.debugElement.query(By.css('#tgt')).nativeElement as HTMLElement;

  // ---- ff como string ----
  it('muestra cuando FeatureFlagsService.isOn devuelve true', () => {
    mockSvc.isOn.mockReturnValue(true);
    const fx = TestBed.createComponent(HostBoundComponent);
    fx.componentInstance.flag = 'nuevoCheckout';
    fx.detectChanges();

    const el = getEl(fx);
    expect(mockSvc.isOn).toHaveBeenCalledWith('nuevoCheckout');
    expect(el.style.display).toBe('');
    expect(el.getAttribute('aria-hidden')).toBe('false');
  });

  it('oculta cuando FeatureFlagsService.isOn devuelve false', () => {
    mockSvc.isOn.mockReturnValue(false);
    const fx = TestBed.createComponent(HostBoundComponent);
    fx.componentInstance.flag = 'betaFeature';
    fx.detectChanges();

    const el = getEl(fx);
    expect(mockSvc.isOn).toHaveBeenCalledWith('betaFeature');
    expect(el.style.display).toBe('none');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('evalúa distintas claves (A→visible, B→oculto) creando fixtures separados', () => {
    // A → true
    mockSvc.isOn.mockReturnValue(true);
    const fx1 = TestBed.createComponent(HostBoundComponent);
    fx1.componentInstance.flag = 'A';
    fx1.detectChanges();
    const el1 = getEl(fx1);
    expect(el1.style.display).toBe('');
    expect(el1.getAttribute('aria-hidden')).toBe('false');

    // B → false
    mockSvc.isOn.mockReturnValue(false);
    const fx2 = TestBed.createComponent(HostBoundComponent);
    fx2.componentInstance.flag = 'B';
    fx2.detectChanges();
    const el2 = getEl(fx2);
    expect(el2.style.display).toBe('none');
    expect(el2.getAttribute('aria-hidden')).toBe('true');

    expect(mockSvc.isOn).toHaveBeenNthCalledWith(1, 'A');
    expect(mockSvc.isOn).toHaveBeenNthCalledWith(2, 'B');
  });

  // ---- ff como boolean ----
  it('ff=false → oculto', () => {
    const fx = TestBed.createComponent(HostBoundComponent);
    fx.componentInstance.flag = false;
    fx.detectChanges();

    const el = getEl(fx);
    expect(el.style.display).toBe('none');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(mockSvc.isOn).not.toHaveBeenCalled();
  });

  it('ff=true → visible', () => {
    const fx = TestBed.createComponent(HostBoundComponent);
    fx.componentInstance.flag = true;
    fx.detectChanges();

    const el = getEl(fx);
    expect(el.style.display).toBe('');
    expect(el.getAttribute('aria-hidden')).toBe('false');
    expect(mockSvc.isOn).not.toHaveBeenCalled();
  });

  it('invierte con ffNot (invert=true y ff=false → visible; invert=true y ff=true → oculto)', () => {
    // invert=true, ff=false → visible
    const fx1 = TestBed.createComponent(HostBoundComponent);
    fx1.componentInstance.invert = true;
    fx1.componentInstance.flag = false;
    fx1.detectChanges();
    const el1 = getEl(fx1);
    expect(el1.style.display).toBe('');
    expect(el1.getAttribute('aria-hidden')).toBe('false');

    // invert=true, ff=true → oculto
    const fx2 = TestBed.createComponent(HostBoundComponent);
    fx2.componentInstance.invert = true;
    fx2.componentInstance.flag = true;
    fx2.detectChanges();
    const el2 = getEl(fx2);
    expect(el2.style.display).toBe('none');
    expect(el2.getAttribute('aria-hidden')).toBe('true');
  });

  // ---- ffNot (atributo & binding) ----
  it('solo ffNot como atributo (sin ff) → oculta por defecto (ff=null → show=true → invert)', () => {
    const fx = TestBed.createComponent(HostAttrOnlyNotComponent);
    fx.detectChanges();

    const el = getEl(fx);
    expect(el.style.display).toBe('none');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('[ffNot]="false" no invierte (ff=null → visible)', () => {
    const fx = TestBed.createComponent(HostBoundComponent);
    fx.componentInstance.flag = null;
    fx.componentInstance.invert = false;
    fx.detectChanges();

    const el = getEl(fx);
    expect(el.style.display).toBe('');
    expect(el.getAttribute('aria-hidden')).toBe('false');
  });

  it('string + ffNot=true: invierte el resultado del servicio (true→oculto, false→visible)', () => {
    // Caso 1: servicio true + invert → oculto
    mockSvc.isOn.mockReturnValue(true);
    const fx1 = TestBed.createComponent(HostBoundComponent);
    fx1.componentInstance.invert = true; // establece inversión primero
    fx1.componentInstance.flag = 'rollout'; // luego la clave
    fx1.detectChanges();
    const el1 = getEl(fx1);
    expect(mockSvc.isOn).toHaveBeenCalledWith('rollout');
    expect(el1.style.display).toBe('none');
    expect(el1.getAttribute('aria-hidden')).toBe('true');

    // Caso 2: servicio false + invert → visible
    mockSvc.isOn.mockReturnValue(false);
    const fx2 = TestBed.createComponent(HostBoundComponent);
    fx2.componentInstance.invert = true;
    fx2.componentInstance.flag = 'rollout';
    fx2.detectChanges();
    const el2 = getEl(fx2);
    expect(el2.style.display).toBe('');
    expect(el2.getAttribute('aria-hidden')).toBe('false');
  });

  // ---- accesibilidad ----
  it('mantiene aria-hidden="false" visible y "true" oculto', () => {
    const fx1 = TestBed.createComponent(HostBoundComponent);
    fx1.componentInstance.flag = true;
    fx1.detectChanges();
    const el1 = getEl(fx1);
    expect(el1.getAttribute('aria-hidden')).toBe('false');

    const fx2 = TestBed.createComponent(HostBoundComponent);
    fx2.componentInstance.flag = false;
    fx2.detectChanges();
    const el2 = getEl(fx2);
    expect(el2.getAttribute('aria-hidden')).toBe('true');
  });
});
