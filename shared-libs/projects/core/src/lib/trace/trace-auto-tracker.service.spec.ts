import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { NavigationEnd, Router, Event as RouterEvent } from '@angular/router';

import { TraceAutoTrackerService } from './trace-auto-tracker.service';
import { AppConfigStore } from '../config/app-config.service';
import { TraceBufferService } from './trace-buffer.service';
import { TraceManagerService } from './trace-manager.service';

describe('TraceAutoTrackerService', () => {
  // Mocks compartidos (funciones)
  const mockConfigStore = { config: jest.fn() };
  const mockBuffer = { start: jest.fn(), stop: jest.fn(), push: jest.fn() };
  const mockTraceMgr = { getTraceId: jest.fn() };

  const FIXED_NOW = new Date('2024-01-02T03:04:05.000Z');

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Defaults para todos los tests; se puede sobrescribir en cada test
    mockConfigStore.config.mockReturnValue({
      appName: 'my-app',
      trace: { audit: true }
    });
    mockTraceMgr.getTraceId.mockReturnValue('TRACE-ID-123');
    jest.clearAllMocks();
  });

  /**
   * Helper para montar el TestBed y devolver lo necesario por test.
   * withRouter: si true, provee un Router falso con events$.
   */
  function setup(withRouter = false) {
    TestBed.resetTestingModule();

    const routerEvents$ = new Subject<RouterEvent>();
    const routerMock = { events: routerEvents$ };

    const providers: any[] = [
      TraceAutoTrackerService,
      { provide: AppConfigStore, useValue: mockConfigStore },
      { provide: TraceBufferService, useValue: mockBuffer },
      { provide: TraceManagerService, useValue: mockTraceMgr }
    ];

    if (withRouter) {
      providers.push({ provide: Router, useValue: routerMock });
    }

    TestBed.configureTestingModule({ providers });

    const service = TestBed.inject(TraceAutoTrackerService);

    return { service, routerEvents$, routerMock };
  }

  describe('start()', () => {
    it('no hace nada si audit está deshabilitado', () => {
      mockConfigStore.config.mockReturnValue({
        appName: 'my-app',
        trace: { audit: false }
      });

      const { service } = setup(false);

      // Ejecutar start (aunque no hay Router, no importa; retorna temprano)
      TestBed.runInInjectionContext(() => service.start());

      expect(mockBuffer.start).not.toHaveBeenCalled();

      // Click global no debe empujar nada
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(mockBuffer.push).not.toHaveBeenCalled();
    });

    it('inicia el buffer y escucha navegación cuando Router está disponible', () => {
      const { service, routerEvents$ } = setup(true);

      TestBed.runInInjectionContext(() => service.start());
      expect(mockBuffer.start).toHaveBeenCalledTimes(1);

      // Emitimos NavigationEnd
      const e = new NavigationEnd(1, '/foo', '/foo?ok=1');
      routerEvents$.next(e);

      expect(mockBuffer.push).toHaveBeenCalledTimes(1);
      const payload = mockBuffer.push.mock.calls[0][0];

      expect(payload).toMatchObject({
        appName: 'my-app',
        traceId: 'TRACE-ID-123',
        stage: 'navigation',
        url: '/foo?ok=1', // usa urlAfterRedirects
        extra: { title: document.title }
      });
      expect(payload.timestamp).toBe(FIXED_NOW.toISOString());
    });

    it('si Router no está disponible, no rompe y sigue trazando clicks', () => {
      const { service } = setup(false);

      TestBed.runInInjectionContext(() => service.start());
      expect(mockBuffer.start).toHaveBeenCalledTimes(1);

      // Crear un target con texto
      const btn = document.createElement('button');
      btn.textContent = '  Hacer algo ahora mismo  ';
      document.body.appendChild(btn);

      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(mockBuffer.push).toHaveBeenCalledTimes(1);
      const payload = mockBuffer.push.mock.calls[0][0];

      expect(payload).toMatchObject({
        appName: 'my-app',
        traceId: 'TRACE-ID-123',
        stage: 'click',
        url: location.pathname + location.search,
        extra: { tag: 'BUTTON', text: 'Hacer algo ahora mismo' }
      });
      expect(payload.timestamp).toBe(FIXED_NOW.toISOString());

      document.body.removeChild(btn);
    });
  });

  describe('stop()', () => {
    it('desuscribe de todo y llama a buf.stop()', () => {
      const { service, routerEvents$ } = setup(true);

      TestBed.runInInjectionContext(() => service.start());
      jest.clearAllMocks(); // limpiamos contadores tras el start

      // Mientras está activo, un click empuja
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(mockBuffer.push).toHaveBeenCalledTimes(1);

      // Parar
      service.stop();
      expect(mockBuffer.stop).toHaveBeenCalledTimes(1);

      // Después de parar, no debe empujar ni por click ni por navegación
      mockBuffer.push.mockClear();

      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));

      expect(mockBuffer.push).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy()', () => {
    it('llama a stop()', () => {
      const { service } = setup(false);
      const spy = jest.spyOn(service, 'stop');

      service.ngOnDestroy();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('payloads', () => {
    it('navigation: usa urlAfterRedirects si existe; si no, usa url', () => {
      const { service, routerEvents$ } = setup(true);

      TestBed.runInInjectionContext(() => service.start());

      // Caso sin urlAfterRedirects: debe usar url
      const e1 = new NavigationEnd(1, '/old', '' as any);
      routerEvents$.next(e1);

      const p1 = mockBuffer.push.mock.calls.at(-1)![0];
      expect(p1.url).toBe('/old');

      // Caso normal con urlAfterRedirects
      const e2 = new NavigationEnd(2, '/x', '/x?y=1');
      routerEvents$.next(e2);

      const p2 = mockBuffer.push.mock.calls.at(-1)![0];
      expect(p2.url).toBe('/x?y=1');
    });

    it('click: recorta texto a 80 chars y usa tag UNKNOWN si no hay target', () => {
      const { service } = setup(false);
      TestBed.runInInjectionContext(() => service.start());

      // 1) texto largo
      const div = document.createElement('div');
      div.textContent = 'x'.repeat(200);
      document.body.appendChild(div);
      div.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const longPayload = mockBuffer.push.mock.calls.at(-1)![0];
      expect(longPayload.extra.text.length).toBe(80);

      // 2) evento sin target
      const evt = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(evt, 'target', { value: null });
      document.dispatchEvent(evt);

      const unknownPayload = mockBuffer.push.mock.calls.at(-1)![0];
      expect(unknownPayload.extra.tag).toBe('UNKNOWN');

      document.body.removeChild(div);
    });
  });
});
