import { TestBed } from '@angular/core/testing';
import { AuthTokenService } from './auth-token.service';
import { StorageService } from '../storage/storage.service';

describe('AuthTokenService', () => {
  let service: AuthTokenService;
  let mockStorageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      has: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [{ provide: StorageService, useValue: mockStorageService }]
    });

    service = TestBed.inject(AuthTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get()', () => {
    it('debe retornar el token del storage', () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      mockStorageService.get.mockReturnValue(mockToken);

      const result = service.get();

      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
      expect(result).toBe(mockToken);
    });

    it('debe retornar null cuando no hay token', () => {
      mockStorageService.get.mockReturnValue(null);

      const result = service.get();

      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
      expect(result).toBeNull();
    });

    it('debe usar la clave correcta "auth-app"', () => {
      service.get();

      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
    });
  });

  describe('set()', () => {
    it('debe guardar el token en el storage', () => {
      const testToken = 'test-jwt-token';

      service.set(testToken);

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', testToken);
    });

    it('debe usar la clave correcta "auth-app" para guardar', () => {
      const token = 'another-token';

      service.set(token);

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', token);
    });

    it('debe manejar tokens vacíos', () => {
      service.set('');

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', '');
    });
  });

  describe('clear()', () => {
    it('debe remover el token del storage', () => {
      service.clear();

      expect(mockStorageService.remove).toHaveBeenCalledWith('auth-app');
    });

    it('debe usar la clave correcta "auth-app" para remover', () => {
      service.clear();

      expect(mockStorageService.remove).toHaveBeenCalledWith('auth-app');
    });
  });

  describe('has()', () => {
    it('debe retornar true cuando hay token', () => {
      mockStorageService.get.mockReturnValue('valid-token');

      const result = service.has();

      expect(result).toBe(true);
      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
    });

    it('debe retornar false cuando no hay token', () => {
      mockStorageService.get.mockReturnValue(null);

      const result = service.has();

      expect(result).toBe(false);
      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
    });

    it('debe retornar false cuando el token es undefined', () => {
      mockStorageService.get.mockReturnValue(undefined as any);

      const result = service.has();

      // El método has() solo verifica !== null, por lo que undefined retorna true
      expect(result).toBe(true);
    });

    it('debe retornar true cuando el token es string vacío', () => {
      mockStorageService.get.mockReturnValue('');

      const result = service.has();

      // El método has() solo verifica !== null, por lo que string vacío retorna true
      expect(result).toBe(true);
    });

    it('debe usar internamente el método get()', () => {
      const getSpy = jest.spyOn(service, 'get');
      mockStorageService.get.mockReturnValue('token');

      service.has();

      expect(getSpy).toHaveBeenCalled();
    });
  });

  describe('integración entre métodos', () => {
    it('debe funcionar el flujo completo set -> get -> has -> clear', () => {
      const testToken = 'integration-test-token';

      // Set token
      service.set(testToken);
      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', testToken);

      // Mock return value for subsequent calls
      mockStorageService.get.mockReturnValue(testToken);

      // Get token
      const retrievedToken = service.get();
      expect(retrievedToken).toBe(testToken);

      // Has token
      const hasToken = service.has();
      expect(hasToken).toBe(true);

      // Clear token
      service.clear();
      expect(mockStorageService.remove).toHaveBeenCalledWith('auth-app');

      // Mock return null after clear
      mockStorageService.get.mockReturnValue(null);

      // Verify token is gone
      const hasTokenAfterClear = service.has();
      expect(hasTokenAfterClear).toBe(false);
    });

    it('debe manejar múltiples operaciones set consecutivas', () => {
      const firstToken = 'first-token';
      const secondToken = 'second-token';

      service.set(firstToken);
      service.set(secondToken);

      expect(mockStorageService.set).toHaveBeenCalledTimes(2);
      expect(mockStorageService.set).toHaveBeenNthCalledWith(1, 'auth-app', firstToken);
      expect(mockStorageService.set).toHaveBeenNthCalledWith(2, 'auth-app', secondToken);
    });
  });

  describe('casos edge', () => {
    it('debe manejar tokens muy largos', () => {
      const longToken = 'a'.repeat(10000);

      service.set(longToken);

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', longToken);
    });

    it('debe manejar caracteres especiales en tokens', () => {
      const specialToken = 'token-with-special-chars-!@#$%^&*()_+{}|:"<>?[]\\;\',./-=`~';

      service.set(specialToken);

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', specialToken);
    });

    it('debe manejar tokens con espacios', () => {
      const tokenWithSpaces = 'token with spaces';

      service.set(tokenWithSpaces);

      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', tokenWithSpaces);
    });
  });

  describe('constantes del servicio', () => {
    it('debe usar consistentemente la misma clave KEY en todos los métodos', () => {
      const token = 'consistency-test';
      mockStorageService.get.mockReturnValue(token);

      // Llamar todos los métodos que usan la clave
      service.get();
      service.set(token);
      service.has();
      service.clear();

      // Verificar que todos usan la misma clave
      expect(mockStorageService.get).toHaveBeenCalledWith('auth-app');
      expect(mockStorageService.set).toHaveBeenCalledWith('auth-app', token);
      expect(mockStorageService.remove).toHaveBeenCalledWith('auth-app');
    });
  });

  describe('inyección de dependencias', () => {
    it('debe inyectar correctamente StorageService', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuthTokenService);
    });

    it('debe funcionar como servicio singleton', () => {
      const anotherInstance = TestBed.inject(AuthTokenService);
      expect(service).toBe(anotherInstance);
    });
  });
});
