import { TestBed } from '@angular/core/testing';
import { SecureStorageService } from './secure-storage.service';
import { CryptoService } from './crypto.service';

describe('SecureStorageService', () => {
  let service: SecureStorageService;
  let cryptoServiceSpy: jest.Mocked<CryptoService>;
  let localStorageSpy: any;

  beforeEach(() => {
    cryptoServiceSpy = {
      encrypt: jest.fn(),
      decrypt: jest.fn()
    } as unknown as jest.Mocked<CryptoService>;

    localStorageSpy = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy
    });

    TestBed.configureTestingModule({
      providers: [{ provide: CryptoService, useValue: cryptoServiceSpy }]
    });
    service = TestBed.inject(SecureStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should encrypt and store value in localStorage', async () => {
    const testKey = 'testKey';
    const testValue = { id: 123, name: 'test' };
    const encryptedValue = 'encrypted-data';
    cryptoServiceSpy.encrypt.mockResolvedValue(encryptedValue);

    await service.setItem(testKey, testValue);

    expect(cryptoServiceSpy.encrypt).toHaveBeenCalledWith(testValue);
    expect(localStorage.setItem).toHaveBeenCalledWith(testKey, encryptedValue);
  });

  it('should handle error when encrypting fails', async () => {
    const testKey = 'testKey';
    const testValue = 'test-value';
    cryptoServiceSpy.encrypt.mockRejectedValue(new Error('Encryption failed'));
    jest.spyOn(console, 'error');

    await service.setItem(testKey, testValue);

    expect(console.error).toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should get and decrypt value from localStorage', async () => {
    const testKey = 'testKey';
    const encryptedValue = 'encrypted-data';
    const decryptedValue = { data: 'test-data' };
    localStorageSpy.getItem.mockReturnValue(encryptedValue);
    cryptoServiceSpy.decrypt.mockResolvedValue(decryptedValue);

    const result = await service.getItem(testKey);

    expect(localStorage.getItem).toHaveBeenCalledWith(testKey);
    expect(cryptoServiceSpy.decrypt).toHaveBeenCalledWith(encryptedValue);
    expect(result).toEqual(decryptedValue);
  });

  it('should return null when key does not exist in localStorage', async () => {
    const testKey = 'nonExistentKey';
    localStorageSpy.getItem.mockReturnValue(null);

    const result = await service.getItem(testKey);

    expect(localStorage.getItem).toHaveBeenCalledWith(testKey);
    expect(cryptoServiceSpy.decrypt).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should handle error when decrypting fails', async () => {
    const testKey = 'testKey';
    const encryptedValue = 'corrupted-data';
    localStorageSpy.getItem.mockReturnValue(encryptedValue);
    cryptoServiceSpy.decrypt.mockRejectedValue(new Error('Decryption failed'));
    jest.spyOn(console, 'error');

    const result = await service.getItem(testKey);

    expect(console.error).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should remove item from localStorage', () => {
    const testKey = 'testKey';
    service.removeItem(testKey);
    expect(localStorage.removeItem).toHaveBeenCalledWith(testKey);
  });

  it('should handle error when removing item fails', () => {
    const testKey = 'testKey';
    localStorageSpy.removeItem.mockImplementation(() => {
      throw 'Storage error';
    });
    jest.spyOn(console, 'error');

    service.removeItem(testKey);

    expect(console.error).toHaveBeenCalled();
  });

  it('should clear localStorage', () => {
    service.clear();
    expect(localStorage.clear).toHaveBeenCalled();
  });

  it('should handle error when clearing localStorage fails', () => {
    localStorageSpy.clear.mockImplementation(() => {
      throw 'Storage error';
    });
    jest.spyOn(console, 'error');
    service.clear();
    expect(console.error).toHaveBeenCalled();
  });
});
