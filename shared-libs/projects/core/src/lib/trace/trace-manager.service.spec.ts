import { TestBed } from '@angular/core/testing';
import { TraceManagerService } from './trace-manager.service';
import { TraceBufferService } from './trace-buffer.service';
import { AppConfigStore } from '../config/app-config.service';
import { AuditEvent, SpanKind } from './models/trace.types';

// Mock de TraceBufferService
const mockTraceBufferService = {
  push: jest.fn()
};

// Mock de AppConfigStore
const mockAppConfigStore = {
  config: jest.fn()
};

// Mock de crypto para uuid predecible
const mockCrypto = {
  getRandomValues: jest.fn()
};

describe('TraceManagerService', () => {
  let service: TraceManagerService;
  let bufferService: typeof mockTraceBufferService;
  let configStore: typeof mockAppConfigStore;
  let performanceSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock crypto globalmente
    (globalThis as any).crypto = mockCrypto;

    // Spy en performance.now
    performanceSpy = jest.spyOn(performance, 'now').mockReturnValue(1000);

    TestBed.configureTestingModule({
      providers: [
        TraceManagerService,
        { provide: TraceBufferService, useValue: mockTraceBufferService },
        { provide: AppConfigStore, useValue: mockAppConfigStore }
      ]
    });

    service = TestBed.inject(TraceManagerService);
    bufferService = mockTraceBufferService;
    configStore = mockAppConfigStore;

    // Setup default mocks
    mockAppConfigStore.config.mockReturnValue({
      appName: 'test-app'
    });

    // Mock para generar UUIDs predecibles
    mockCrypto.getRandomValues.mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i;
      }
      return arr;
    });

    // Reset mocks
    jest.clearAllMocks();
    performanceSpy.mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTraceId', () => {
    it('debe devolver un trace ID de sesión consistente', () => {
      const traceId1 = service.getTraceId();
      const traceId2 = service.getTraceId();

      expect(traceId1).toBe(traceId2);
      expect(typeof traceId1).toBe('string');
      expect(traceId1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });
  });

  describe('getActiveSpan', () => {
    it('debe devolver undefined cuando no hay spans activos', () => {
      const activeSpan = service.getActiveSpan();
      expect(activeSpan).toBeUndefined();
    });

    it('debe devolver el span más reciente cuando hay spans en la pila', () => {
      const span1 = service.startSpan('First', 'method');
      const span2 = service.startSpan('Second', 'http');

      const activeSpan = service.getActiveSpan();
      expect(activeSpan).toBe(span2);
      expect(activeSpan?.name).toBe('Second');
    });
  });

  describe('startSpan', () => {
    it('debe crear un span root cuando no hay span activo', () => {
      const span = service.startSpan('TestSpan', 'method', { test: 'meta' });

      expect(span.name).toBe('TestSpan');
      expect(span.kind).toBe('method');
      expect(span.traceId).toBe(service.getTraceId());
      expect(span.parentSpanId).toBeUndefined();
      expect(span.meta).toEqual({ test: 'meta' });
      expect(typeof span.spanId).toBe('string');
      expect(span.startTs).toBe(1000);
    });

    it('debe crear un span hijo con parentSpanId cuando hay span activo', () => {
      const parentSpan = service.startSpan('Parent', 'method');
      const childSpan = service.startSpan('Child', 'http');

      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
      expect(childSpan.traceId).toBe(parentSpan.traceId);
    });

    it('debe enviar evento span_start al buffer', () => {
      const meta = { userId: '123' };
      const span = service.startSpan('TestMethod', 'method', meta);

      expect(bufferService.push).toHaveBeenCalledWith({
        appName: 'test-app',
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: undefined,
        kind: 'method',
        name: 'TestMethod',
        stage: 'span_start',
        timestamp: expect.any(String),
        extra: meta
      });
    });

    it('debe manejar diferentes tipos de SpanKind', () => {
      const kinds: SpanKind[] = ['method', 'http', 'route', 'click', 'custom'];

      kinds.forEach(kind => {
        const span = service.startSpan(`Test${kind}`, kind);
        expect(span.kind).toBe(kind);
      });
    });

    it('debe agregar el span a la pila interna', () => {
      const span1 = service.startSpan('First', 'method');
      const span2 = service.startSpan('Second', 'http');

      expect(service.getActiveSpan()).toBe(span2);
    });
  });

  describe('endSpan', () => {
    it('debe remover el span activo de la pila', () => {
      const span1 = service.startSpan('First', 'method');
      const span2 = service.startSpan('Second', 'http');

      jest.clearAllMocks();
      performanceSpy.mockReturnValue(1500);

      service.endSpan(span2, { status: 200 });

      expect(service.getActiveSpan()).toBe(span1);
      expect(bufferService.push).toHaveBeenCalledWith({
        appName: 'test-app',
        traceId: span2.traceId,
        spanId: span2.spanId,
        parentSpanId: span2.parentSpanId,
        kind: span2.kind,
        name: span2.name,
        stage: 'span_end',
        durationMs: 500,
        timestamp: expect.any(String),
        extra: { status: 200 }
      });
    });

    it('debe remover span no-activo de cualquier posición en la pila', () => {
      const span1 = service.startSpan('First', 'method');
      const span2 = service.startSpan('Second', 'http');
      const span3 = service.startSpan('Third', 'click');

      jest.clearAllMocks();
      performanceSpy.mockReturnValue(2000);

      service.endSpan(span1);

      expect(service.getActiveSpan()).toBe(span3);
    });

    it('debe calcular la duración correctamente', () => {
      const span = service.startSpan('Test', 'method');

      jest.clearAllMocks();
      performanceSpy.mockReturnValue(1250.7);

      service.endSpan(span);

      expect(bufferService.push).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 251
        })
      );
    });

    it('debe incluir extra data en el evento span_end', () => {
      const span = service.startSpan('Test', 'http');
      const extraData = {
        status: 404,
        error: 'Not found',
        responseTime: 150
      };

      jest.clearAllMocks();

      service.endSpan(span, extraData);

      expect(bufferService.push).toHaveBeenCalledWith(
        expect.objectContaining({
          extra: extraData
        })
      );
    });
  });

  describe('runWithSpan', () => {
    it('debe ejecutar función síncrona y cerrar span exitosamente', async () => {
      const syncFunction = jest.fn().mockReturnValue('sync result');
      const meta = { operation: 'sync-test' };

      const result = await service.runWithSpan('SyncTest', 'method', syncFunction, meta);

      expect(result).toBe('sync result');
      expect(syncFunction).toHaveBeenCalledTimes(1);
      expect(bufferService.push).toHaveBeenCalledTimes(2);
    });

    it('debe ejecutar función asíncrona y cerrar span exitosamente', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('async result');

      const result = await service.runWithSpan('AsyncTest', 'http', asyncFunction);

      expect(result).toBe('async result');
      expect(asyncFunction).toHaveBeenCalledTimes(1);
      expect(bufferService.push).toHaveBeenCalledTimes(2);
    });

    it('debe manejar errores síncronos y cerrar span con error', async () => {
      const error = new Error('Sync error');
      const syncFunction = jest.fn().mockImplementation(() => {
        throw error;
      });

      await expect(service.runWithSpan('ErrorTest', 'method', syncFunction)).rejects.toThrow(
        'Sync error'
      );

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          stage: 'span_end',
          extra: { error: '{}' }
        })
      );
    });

    it('debe manejar errores asíncronos y cerrar span con error', async () => {
      const error = new Error('Async error');
      const asyncFunction = jest.fn().mockRejectedValue(error);

      await expect(service.runWithSpan('AsyncErrorTest', 'http', asyncFunction)).rejects.toThrow(
        'Async error'
      );

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          stage: 'span_end',
          extra: { error: '{}' }
        })
      );
    });

    it('debe manejar objetos de error no serializables', async () => {
      const circularError: any = { message: 'test' };
      circularError.self = circularError;

      const errorFunction = jest.fn().mockImplementation(() => {
        throw circularError;
      });

      await expect(service.runWithSpan('CircularErrorTest', 'method', errorFunction)).rejects.toBe(
        circularError
      );

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          stage: 'span_end',
          extra: { error: '[object Object]' }
        })
      );
    });
  });

  describe('getActiveMethodName', () => {
    it('debe devolver undefined cuando no hay spans de método', () => {
      service.startSpan('HttpCall', 'http');
      service.startSpan('Click', 'click');

      const methodName = service.getActiveMethodName();
      expect(methodName).toBeUndefined();
    });

    it('debe devolver el nombre del span de método más reciente', () => {
      service.startSpan('FirstMethod', 'method');
      service.startSpan('HttpCall', 'http');
      service.startSpan('SecondMethod', 'method');
      service.startSpan('Click', 'click');

      const methodName = service.getActiveMethodName();
      expect(methodName).toBe('SecondMethod');
    });

    it('debe buscar hacia atrás en la pila hasta encontrar un método', () => {
      service.startSpan('BaseMethod', 'method');
      service.startSpan('HttpCall1', 'http');
      service.startSpan('HttpCall2', 'http');

      const methodName = service.getActiveMethodName();
      expect(methodName).toBe('BaseMethod');
    });
  });

  describe('safeString', () => {
    it('debe manejar strings directamente', async () => {
      const stringError = 'Simple string error';
      const errorFunction = () => {
        throw stringError;
      };

      await expect(service.runWithSpan('StringTest', 'method', errorFunction)).rejects.toBe(
        stringError
      );

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          extra: { error: 'Simple string error' }
        })
      );
    });

    it('debe serializar objetos serializables con JSON.stringify', async () => {
      const objectError = { code: 500, message: 'Server error' };
      const errorFunction = () => {
        throw objectError;
      };

      await expect(service.runWithSpan('ObjectTest', 'method', errorFunction)).rejects.toBe(
        objectError
      );

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          extra: { error: '{"code":500,"message":"Server error"}' }
        })
      );
    });

    it('debe usar String() como fallback para objetos no serializables', async () => {
      const nonSerializable: any = { toString: () => 'Custom toString' };
      nonSerializable.circular = nonSerializable;
      const errorFunction = () => {
        throw nonSerializable;
      };

      await expect(
        service.runWithSpan('NonSerializableTest', 'method', errorFunction)
      ).rejects.toBe(nonSerializable);

      expect(bufferService.push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          extra: { error: 'Custom toString' }
        })
      );
    });
  });

  describe('integración de pila de spans', () => {
    it('debe mantener jerarquía correcta de spans padre-hijo', () => {
      const rootSpan = service.startSpan('Root', 'method');
      expect(service.getActiveSpan()).toBe(rootSpan);

      const child1 = service.startSpan('Child1', 'http');
      expect(child1.parentSpanId).toBe(rootSpan.spanId);
      expect(service.getActiveSpan()).toBe(child1);

      const child2 = service.startSpan('Child2', 'click');
      expect(child2.parentSpanId).toBe(child1.spanId);
      expect(service.getActiveSpan()).toBe(child2);

      service.endSpan(child2);
      expect(service.getActiveSpan()).toBe(child1);

      service.endSpan(child1);
      expect(service.getActiveSpan()).toBe(rootSpan);

      service.endSpan(rootSpan);
      expect(service.getActiveSpan()).toBeUndefined();
    });

    it('debe manejar cierre de spans fuera de orden', () => {
      const span1 = service.startSpan('First', 'method');
      const span2 = service.startSpan('Second', 'http');
      const span3 = service.startSpan('Third', 'click');

      service.endSpan(span1);
      expect(service.getActiveSpan()).toBe(span3);

      service.endSpan(span3);
      expect(service.getActiveSpan()).toBe(span2);
    });
  });
});
