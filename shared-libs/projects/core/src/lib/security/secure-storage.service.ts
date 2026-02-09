import { inject, Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';

/**
 * Service for securely storing and retrieving data in localStorage.
 *
 * This service uses encryption provided by CryptoService to ensure
 * that sensitive data stored in the browser's localStorage is protected.
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private cryptoService = inject(CryptoService);

  /**
   * Securely stores a value in localStorage using encryption.
   *
   * @param key The storage key
   * @param value The value to store (preserves original type)
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const encryptedValue = await this.cryptoService.encrypt(value);
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error(`❌ Error encrypting and saving to localStorage [${key}]:`, error);
    }
  }

  /**
   * Securely retrieves a value from localStorage using decryption.
   *
   * @param key The storage key
   * @returns The stored value in its original type or `null` if it doesn't exist
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;

      return await this.cryptoService.decrypt<T>(encryptedValue);
    } catch (error) {
      console.error(`❌ Error decrypting and retrieving from localStorage [${key}]:`, error);
      return null;
    }
  }

  /**
   * Removes a specific item from localStorage.
   *
   * @param key The storage key to remove
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`❌ Error removing item from localStorage [${key}]:`, error);
    }
  }

  /**
   * Clears all items from localStorage.
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  }
}
