import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext } from '@angular/common/http';
import { of, throwError, Observable } from 'rxjs';
import { TraceReporterService } from './trace-reporter.service';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AuditEvent } from './models/trace.types';

// Mock del HttpClient
const mockHttpClient = {
  post: jest.fn()
};

// Mock del AppConfigStore
const mockAppConfigStore = {
  config: jest.fn()
};

describe('TraceReporterService', () => {
  let service: TraceReporterService;
  let httpClient: typeof mockHttpClient;
  let appConfigStore: typeof mockAppConfigStore;

  const mockAuditEvent: AuditEvent = {
    appName: 'test-app',
    traceId: 'test-trace-id',
    spanId: 'test-span-id',
    stage: 'span_start',
    timestamp: '2024-01-01T00:00:00.000Z',
    extra: { test: 'data' }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TraceReporterService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AppConfigStore, useValue: mockAppConfigStore }
      ]
    });

    service = TestBed.inject(TraceReporterService);
    httpClient = mockHttpClient;
    appConfigStore = mockAppConfigStore;

    // Reset mocks
    jest.clearAllMocks();
    mockHttpClient.post.mockReturnValue(of({}));
  });

  describe('send', () => {
    it('debe enviar evento cuando trace.audit está habilitado y auditHost existe', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/api'
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://audit.example.com/api',
        mockAuditEvent,
        {
          context: expect.any(HttpContext)
        }
      );

      // Verificar que el contexto tiene BYPASS_INTERCEPTORS = true
      const callArgs = mockHttpClient.post.mock.calls[0];
      const context = callArgs[2].context as HttpContext;
      expect(context.get(BYPASS_INTERCEPTORS)).toBe(true);
    });

    it('no debe enviar cuando trace.audit es false', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: false,
          auditHost: 'https://audit.example.com/api'
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('no debe enviar cuando trace.audit es undefined', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          auditHost: 'https://audit.example.com/api'
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('no debe enviar cuando auditHost no existe', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('no debe enviar cuando auditHost es string vacío', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: ''
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('no debe enviar cuando trace es undefined', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({});

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('debe manejar errores HTTP silenciosamente', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/api'
        }
      });

      const error = new Error('Network error');
      mockHttpClient.post.mockReturnValue(throwError(() => error));

      // Act & Assert - no debe lanzar error
      expect(() => service.send(mockAuditEvent)).not.toThrow();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('debe usar take(1) para completar automáticamente', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/api'
        }
      });

      const mockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      };

      mockHttpClient.post.mockReturnValue(mockObservable);

      // Act
      service.send(mockAuditEvent);

      // Assert
      expect(mockObservable.pipe).toHaveBeenCalled();
      expect(mockObservable.subscribe).toHaveBeenCalled();
    });
  });

  describe('sendBatch', () => {
    const mockEvents: AuditEvent[] = [
      mockAuditEvent,
      {
        ...mockAuditEvent,
        spanId: 'test-span-id-2',
        stage: 'span_end'
      }
    ];

    it('debe enviar batch de eventos cuando trace.audit está habilitado', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch(mockEvents);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://audit.example.com/batch',
        mockEvents,
        {
          context: expect.any(HttpContext)
        }
      );
    });

    it('no debe enviar cuando el array de eventos está vacío', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch([]);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('debe manejar array con un solo evento', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch([mockAuditEvent]);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://audit.example.com/batch',
        [mockAuditEvent],
        expect.any(Object)
      );
    });

    it('no debe enviar batch cuando trace.audit es false', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: false,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch(mockEvents);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('no debe enviar batch cuando auditHost no existe', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true
        }
      });

      // Act
      service.sendBatch(mockEvents);

      // Assert
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('debe manejar errores HTTP en batch silenciosamente', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      const error = new Error('Batch upload failed');
      mockHttpClient.post.mockReturnValue(throwError(() => error));

      // Act & Assert - no debe lanzar error
      expect(() => service.sendBatch(mockEvents)).not.toThrow();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('debe manejar array con muchos eventos', () => {
      // Arrange
      const manyEvents = Array.from({ length: 100 }, (_, i) => ({
        ...mockAuditEvent,
        spanId: `span-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }));

      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch(manyEvents);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://audit.example.com/batch',
        manyEvents,
        expect.any(Object)
      );
      expect(manyEvents).toHaveLength(100);
    });
  });

  describe('configuración de contexto HTTP', () => {
    it('debe establecer BYPASS_INTERCEPTORS en true para evitar interceptación', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/api'
        }
      });

      // Act
      service.send(mockAuditEvent);

      // Assert
      const callArgs = mockHttpClient.post.mock.calls[0];
      const options = callArgs[2];
      const context = options.context as HttpContext;

      expect(context).toBeInstanceOf(HttpContext);
      expect(context.get(BYPASS_INTERCEPTORS)).toBe(true);
    });

    it('debe usar la misma configuración de contexto para batch', () => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/batch'
        }
      });

      // Act
      service.sendBatch([mockAuditEvent]);

      // Assert
      const callArgs = mockHttpClient.post.mock.calls[0];
      const options = callArgs[2];
      const context = options.context as HttpContext;

      expect(context).toBeInstanceOf(HttpContext);
      expect(context.get(BYPASS_INTERCEPTORS)).toBe(true);
    });
  });

  describe('integración con observables', () => {
    it('debe completar la suscripción automáticamente con take(1)', done => {
      // Arrange
      mockAppConfigStore.config.mockReturnValue({
        trace: {
          audit: true,
          auditHost: 'https://audit.example.com/api'
        }
      });

      let subscriptionCompleted = false;
      mockHttpClient.post.mockReturnValue(
        of('success').pipe(
          // Simular que la suscripción se completa
          source => {
            return new Observable(subscriber => {
              const sub = source.subscribe({
                next: value => subscriber.next(value),
                error: error => subscriber.error(error),
                complete: () => {
                  subscriptionCompleted = true;
                  subscriber.complete();
                  // Verificar después de que se complete
                  setTimeout(() => {
                    expect(subscriptionCompleted).toBe(true);
                    done();
                  }, 0);
                }
              });
              return () => sub.unsubscribe();
            });
          }
        )
      );

      // Act
      service.send(mockAuditEvent);
    });
  });
});
