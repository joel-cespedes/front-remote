import { Trace } from './trace.decorator';
import { InjectorHolder } from '../helpers/injector-holder';
import { TraceManagerService } from './trace-manager.service';
import { TraceSpan } from './models/trace.types';

// Mock del TraceManagerService
const mockTraceManagerService: Partial<TraceManagerService> = {
  startSpan: jest.fn(),
  endSpan: jest.fn(),
  getTraceId: jest.fn(),
  getActiveSpan: jest.fn(),
  runWithSpan: jest.fn(),
  getActiveMethodName: jest.fn()
};

// Mock del span
const mockSpan: TraceSpan = {
  spanId: 'test-span-id',
  traceId: 'test-trace-id',
  kind: 'method',
  name: 'TestMethod',
  startTs: 100
};

// Mock del InjectorHolder
jest.mock('../helpers/injector-holder', () => ({
  InjectorHolder: {
    get: jest.fn()
  }
}));

describe('Decorador @Trace', () => {
  let mockInjectorGet: jest.MockedFunction<typeof InjectorHolder.get>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInjectorGet = InjectorHolder.get as jest.MockedFunction<typeof InjectorHolder.get>;
    mockInjectorGet.mockReturnValue(mockTraceManagerService as TraceManagerService);
    (mockTraceManagerService.startSpan as jest.Mock).mockReturnValue(mockSpan);
  });

  describe('métodos síncronos', () => {
    it('debe crear un span y finalizarlo exitosamente', () => {
      // Arrange
      class TestClass {
        @Trace()
        testMethod(value: string): string {
          return `processed: ${value}`;
        }
      }

      const instance = new TestClass();

      // Act
      const result = instance.testMethod('hello');

      // Assert
      expect(result).toBe('processed: hello');
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(
        'TestClass.testMethod',
        'method',
        undefined
      );
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan);
    });

    it('debe usar nombre personalizado cuando se proporciona', () => {
      // Arrange
      class TestClass {
        @Trace('CustomMethodName')
        testMethod(): void {
          // método vacío
        }
      }

      const instance = new TestClass();

      // Act
      instance.testMethod();

      // Assert
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(
        'CustomMethodName',
        'method',
        undefined
      );
    });

    it('debe incluir metadata cuando se proporciona', () => {
      // Arrange
      const meta = { userId: '123', action: 'create' };

      class TestClass {
        @Trace('ProcessData', meta)
        processData(): string {
          return 'data processed';
        }
      }

      const instance = new TestClass();

      // Act
      instance.processData();

      // Assert
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith('ProcessData', 'method', meta);
    });

    it('debe manejar errores síncronos correctamente', () => {
      // Arrange
      class TestClass {
        @Trace()
        throwError(): never {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      // Act & Assert
      expect(() => instance.throwError()).toThrow('Test error');
      expect(mockTraceManagerService.startSpan).toHaveBeenCalled();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { error: '{}' });
    });

    it('debe manejar errores no-string correctamente', () => {
      // Arrange
      class TestClass {
        @Trace()
        throwObjectError(): never {
          throw { code: 500, message: 'Server error' };
        }
      }

      const instance = new TestClass();

      // Act & Assert
      expect(() => instance.throwObjectError()).toThrow();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, {
        error: '{"code":500,"message":"Server error"}'
      });
    });

    it('debe usar "Object" cuando no hay constructor name', () => {
      // Arrange
      const descriptor = {
        value: function testMethod() {
          return 'result';
        }
      } as PropertyDescriptor;

      const target = {};

      // Act
      Trace()(target, 'testMethod', descriptor);
      const result = descriptor.value();

      // Assert
      expect(result).toBe('result');
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(
        'Object.testMethod',
        'method',
        undefined
      );
    });
  });

  describe('métodos asíncronos', () => {
    it('debe crear un span y finalizarlo exitosamente para Promise', async () => {
      // Arrange
      class TestClass {
        @Trace()
        async asyncMethod(value: string): Promise<string> {
          return `async processed: ${value}`;
        }
      }

      const instance = new TestClass();

      // Act
      const result = await instance.asyncMethod('hello');

      // Assert
      expect(result).toBe('async processed: hello');
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(
        'TestClass.asyncMethod',
        'method',
        undefined
      );
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan);
    });

    it('debe manejar errores asíncronos correctamente', async () => {
      // Arrange
      class TestClass {
        @Trace()
        async asyncThrowError(): Promise<never> {
          throw new Error('Async error');
        }
      }

      const instance = new TestClass();

      // Act & Assert
      await expect(instance.asyncThrowError()).rejects.toThrow('Async error');
      expect(mockTraceManagerService.startSpan).toHaveBeenCalled();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { error: '{}' });
    });

    it('debe manejar Promise rechazada con objeto', async () => {
      // Arrange
      class TestClass {
        @Trace()
        async asyncThrowObject(): Promise<never> {
          throw { status: 404, error: 'Not found' };
        }
      }

      const instance = new TestClass();

      // Act & Assert
      await expect(instance.asyncThrowObject()).rejects.toEqual({
        status: 404,
        error: 'Not found'
      });
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, {
        error: '{"status":404,"error":"Not found"}'
      });
    });

    it('debe manejar Promise con valor resuelto complejo', async () => {
      // Arrange
      class TestClass {
        @Trace('ComplexAsync')
        async getComplexData(): Promise<{ data: string[]; count: number }> {
          return { data: ['item1', 'item2'], count: 2 };
        }
      }

      const instance = new TestClass();

      // Act
      const result = await instance.getComplexData();

      // Assert
      expect(result).toEqual({ data: ['item1', 'item2'], count: 2 });
      expect(mockTraceManagerService.startSpan).toHaveBeenCalledWith(
        'ComplexAsync',
        'method',
        undefined
      );
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan);
    });
  });

  describe('función safeString', () => {
    it('debe manejar objetos no serializables', () => {
      // Arrange
      class TestClass {
        @Trace()
        throwCircularError(): never {
          const circular: any = { prop: 'value' };
          circular.self = circular; // referencia circular
          throw circular;
        }
      }

      const instance = new TestClass();

      // Act & Assert
      expect(() => instance.throwCircularError()).toThrow();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, {
        error: '[object Object]'
      });
    });

    it('debe manejar valores null y undefined', () => {
      // Arrange
      class TestClass {
        @Trace()
        throwNull(): never {
          throw null;
        }

        @Trace()
        throwUndefined(): never {
          throw undefined;
        }
      }

      const instance = new TestClass();

      // Act & Assert - null
      expect(() => instance.throwNull()).toThrow();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { error: 'null' });

      // Reset
      jest.clearAllMocks();
      (mockTraceManagerService.startSpan as jest.Mock).mockReturnValue(mockSpan);

      // Act & Assert - undefined
      expect(() => instance.throwUndefined()).toThrow();
      expect(mockTraceManagerService.endSpan).toHaveBeenCalledWith(mockSpan, { error: undefined });
    });
  });

  describe('manejo de errores de InjectorHolder', () => {
    it('debe propagar error si InjectorHolder.get() falla', () => {
      // Arrange
      mockInjectorGet.mockImplementation(() => {
        throw new Error('InjectorHolder not set yet');
      });

      class TestClass {
        @Trace()
        testMethod(): string {
          return 'test';
        }
      }

      const instance = new TestClass();

      // Act & Assert
      expect(() => instance.testMethod()).toThrow('InjectorHolder not set yet');
    });
  });

  describe('preservación de contexto', () => {
    it('debe preservar el contexto "this" del método original', () => {
      // Arrange
      class TestClass {
        private value = 'instance value';

        @Trace()
        getValue(): string {
          return this.value;
        }
      }

      const instance = new TestClass();

      // Act
      const result = instance.getValue();

      // Assert
      expect(result).toBe('instance value');
    });

    it('debe pasar argumentos correctamente al método original', () => {
      // Arrange
      class TestClass {
        @Trace()
        multiply(a: number, b: number, c: number = 1): number {
          return a * b * c;
        }
      }

      const instance = new TestClass();

      // Act
      const result = instance.multiply(2, 3, 4);

      // Assert
      expect(result).toBe(24);
    });
  });
});
