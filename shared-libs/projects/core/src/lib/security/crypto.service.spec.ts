import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';

const cryptoMock = {
  subtle: {
    importKey: jest.fn().mockResolvedValue('mock-key'),
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    generateKey: jest.fn().mockResolvedValue('mock-generated-key'),
    exportKey: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6]))
  },
  getRandomValues: jest.fn(buffer => buffer)
};

Object.defineProperty(window, 'crypto', {
  value: cryptoMock,
  writable: true
});

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    // Mock environment before creating the service
    jest.mock('../../../../../src/environments/environment', () => ({
      environment: {
        encryptionKey: 'TestEncryptionKey123'
      }
    }));

    TestBed.configureTestingModule({
      providers: [CryptoService]
    });
    service = TestBed.inject(CryptoService);

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should encrypt a string value', async () => {
    jest.spyOn(service as any, 'arrayBufferToBase64').mockReturnValue('def');
    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(8));
    jest.spyOn(crypto, 'getRandomValues').mockReturnValue(new Uint8Array(12));

    const encrypted = await service.encrypt('test-data');
    expect(encrypted).toContain('.');
  });

  it('should encrypt an object', async () => {
    const testObj = { id: 123 };
    jest.spyOn(service as any, 'arrayBufferToBase64').mockReturnValue('def');
    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(8));
    jest.spyOn(crypto, 'getRandomValues').mockReturnValue(new Uint8Array(12));

    const encrypted = await service.encrypt(testObj);
    expect(encrypted).toContain('.');
  });

  it('should decrypt data', async () => {
    const testData = { foo: 'bar' };
    const encoder = new TextEncoder();

    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(service as any, 'base64ToArrayBuffer').mockReturnValue(new ArrayBuffer(8));
    jest
      .spyOn(crypto.subtle, 'decrypt')
      .mockResolvedValue(encoder.encode(JSON.stringify(testData)));

    const decrypted = await service.decrypt<typeof testData>('abc.def');
    expect(decrypted).toEqual(testData);
  });

  it('should throw error when decrypting invalid data', async () => {
    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(service as any, 'base64ToArrayBuffer').mockReturnValue(new ArrayBuffer(8));
    jest.spyOn(crypto.subtle, 'decrypt').mockRejectedValue(new Error('Decrypt failed'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await service.decrypt<string>('invalid-data');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toEqual(new Error('Error while decrypting data.'));
    }
  });

  it('should throw error when encryption fails', async () => {
    jest.clearAllMocks();

    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(crypto.subtle, 'encrypt').mockRejectedValue(new Error('Encryption failed'));

    try {
      await service.encrypt('test-data');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toEqual(new Error('Error while encrypting data.'));
    }

    // Verifica solo que la función fue llamada
    expect(console.error).toHaveBeenCalled();
  });

  it('should convert ArrayBuffer to Base64 string', () => {
    const buffer = new Uint8Array([84, 101, 115, 116]).buffer;
    const result = (service as any).arrayBufferToBase64(buffer);

    const expected = btoa(String.fromCharCode(84, 101, 115, 116));
    expect(result).toBe(expected);
  });

  it('should convert Base64 string to ArrayBuffer', () => {
    const base64 = 'VGVzdA==';
    const result = (service as any).base64ToArrayBuffer(base64);

    const expectedArray = new Uint8Array([84, 101, 115, 116]);
    expect(new Uint8Array(result)).toEqual(expectedArray);
  });

  it('should handle end-to-end encryption and decryption', async () => {
    const testData = { test: 'full cycle' };
    const mockEncrypted = 'mockIv.mockEncryptedData';
    const encoder = new TextEncoder();

    const arrayBufferToBase64Spy = jest.spyOn(service as any, 'arrayBufferToBase64');
    arrayBufferToBase64Spy.mockReturnValueOnce('mockIv');
    arrayBufferToBase64Spy.mockReturnValueOnce('mockEncryptedData');
    jest.spyOn(service as any, 'loadKey').mockResolvedValue({});
    jest.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(8));
    jest.spyOn(crypto, 'getRandomValues').mockReturnValue(new Uint8Array(12));

    const base64ToArrayBufferSpy = jest.spyOn(service as any, 'base64ToArrayBuffer');
    base64ToArrayBufferSpy.mockReturnValueOnce(new ArrayBuffer(8));
    base64ToArrayBufferSpy.mockReturnValueOnce(new ArrayBuffer(8));
    jest
      .spyOn(crypto.subtle, 'decrypt')
      .mockResolvedValue(encoder.encode(JSON.stringify(testData)));

    const encrypted = await service.encrypt(testData);
    expect(encrypted).toBe(mockEncrypted);

    const decrypted = await service.decrypt<typeof testData>(encrypted);
    expect(decrypted).toEqual(testData);
  });

  // Test for non-browser environment
  it('should handle non-browser environment for key import', async () => {
    // Save original window.crypto
    const originalCrypto = window.crypto;

    // Mock window.crypto to be undefined to simulate non-browser environment
    Object.defineProperty(window, 'crypto', {
      value: undefined,
      writable: true
    });

    // Create new instance to trigger key loading in non-browser environment
    const nonBrowserService = new CryptoService();

    // Test a method that would use the key using a simpler Jest async assertion
    try {
      await nonBrowserService['importKeyFromRaw'](new ArrayBuffer(0));
      // If we reach here, the promise resolved successfully without throwing
      expect(true).toBeTruthy(); // Test passes if we reach this line
    } catch (error) {
      // If we get here, the promise rejected
      fail('importKeyFromRaw should not have thrown an error');
    }

    // Restore window.crypto
    Object.defineProperty(window, 'crypto', {
      value: originalCrypto,
      writable: true
    });
  });

  // Test key loading in encrypt method
  it('should load key if not available when encrypting', async () => {
    // Create spy on loadKey method
    const loadKeySpy = jest.spyOn(service as any, 'loadKey').mockResolvedValue(undefined);

    // Set key to null to force loadKey call
    (service as any).key = null;

    try {
      await service.encrypt('test data');
    } catch (error) {
      // Expected to fail after loadKey is called
    }

    // Verify loadKey was called
    expect(loadKeySpy).toHaveBeenCalled();
  });

  // Test key loading in decrypt method
  it('should load key if not available when decrypting', async () => {
    // Create spy on loadKey method
    const loadKeySpy = jest.spyOn(service as any, 'loadKey').mockResolvedValue(undefined);

    // Set key to null to force loadKey call
    (service as any).key = null;

    try {
      await service.decrypt<string>('invalid.data');
    } catch (error) {
      // Expected to fail after loadKey is called
    }

    // Verify loadKey was called
    expect(loadKeySpy).toHaveBeenCalled();
  });

  // Additional tests for encryption/decryption functionality
  it('should encrypt and decrypt data successfully', async () => {
    // Mock crypto functionality for testing
    const originalCrypto = window.crypto;
    const mockSubtle = {
      importKey: jest.fn().mockResolvedValue('mock-key'),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      decrypt: jest.fn().mockResolvedValue(new TextEncoder().encode(JSON.stringify('test-data')))
    };

    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: mockSubtle,
        getRandomValues: () => new Uint8Array(12)
      },
      writable: true
    });

    // Set the key directly to bypass loading
    (service as any).key = 'mock-key';

    // Test encryption
    const encrypted = await service.encrypt('test-data');
    expect(encrypted).toBeTruthy();

    // Test decryption
    const decrypted = await service.decrypt<string>(encrypted);
    expect(decrypted).toBe('test-data');

    // Restore original crypto
    Object.defineProperty(window, 'crypto', {
      value: originalCrypto,
      writable: true
    });
  });
});
