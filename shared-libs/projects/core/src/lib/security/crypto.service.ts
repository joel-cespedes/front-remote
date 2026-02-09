import { Injectable } from '@angular/core';

/**
 * Service for encrypting and decrypting data using Web Crypto API.
 *
 * This service provides AES-GCM encryption for secure data handling,
 * using an encryption key that can be configured via the setKey() method.
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private key: CryptoKey | null = null;
  private encryptionKey = '1234567890abcdef'; // Default key (should be overridden in production)

  constructor() {
    this.loadKey();
  }

  /**
   * Sets a custom encryption key.
   * @param keyString The encryption key string
   */
  setKey(keyString: string): void {
    this.encryptionKey = keyString;
    this.loadKey();
  }

  /**
   * Loads the encryption key.
   */
  private async loadKey(): Promise<void> {
    this.key = await this.importKey(this.encryptionKey);
  }

  /**
   * Imports an encryption key from the provided string.
   *
   * @param keyString The string to use as encryption key
   * @returns A CryptoKey object for use with Web Crypto API
   */
  private async importKey(keyString: string): Promise<CryptoKey> {
    const rawKey = new TextEncoder().encode(keyString);
    return this.importKeyFromRaw(rawKey.buffer);
  }

  /**
   * Imports an encryption key from the provided ArrayBuffer.
   *
   * @param rawKey The ArrayBuffer to use as encryption key
   * @returns A CryptoKey object for use with Web Crypto API
   */
  private importKeyFromRaw(rawKey: ArrayBuffer): Promise<CryptoKey> {
    // Verificar si estamos en un entorno de prueba
    const isBrowser = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;

    if (isBrowser) {
      return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        {
          name: 'AES-GCM'
        },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      return Promise.resolve({} as CryptoKey);
    }
  }

  /**
   * Encrypts data of any type.
   *
   * @param data The data to encrypt (can be an object, string, number, etc.)
   * @returns A Base64 string containing the encrypted value
   */
  async encrypt<T>(data: T): Promise<string> {
    try {
      if (!this.key) await this.loadKey();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
      const encodedData = new TextEncoder().encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key!,
        encodedData
      );

      return `${this.arrayBufferToBase64(iv.buffer)}.${this.arrayBufferToBase64(encrypted)}`;
    } catch (error) {
      console.error('❌ Error encrypting data:', error);
      throw new Error('Error while encrypting data.');
    }
  }

  /**
   * Decrypts data stored as a Base64 string.
   *
   * @param encryptedData The Base64 encrypted string
   * @returns The decrypted data in its original type
   */
  async decrypt<T>(encryptedData: string): Promise<T> {
    try {
      if (!this.key) await this.loadKey();
      const [ivBase64, dataBase64] = encryptedData.split('.');
      const iv = this.base64ToArrayBuffer(ivBase64);
      const encrypted = this.base64ToArrayBuffer(dataBase64);

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key!, encrypted);

      return JSON.parse(new TextDecoder().decode(decrypted)) as T;
    } catch (error) {
      console.error('❌ Error decrypting data:', error);
      throw new Error('Error while decrypting data.');
    }
  }

  /**
   * Converts an ArrayBuffer to a Base64 string.
   *
   * @param buffer The ArrayBuffer to convert
   * @returns Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  /**
   * Converts a Base64 string to an ArrayBuffer.
   *
   * @param base64 The Base64 string to convert
   * @returns The corresponding ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Uint8Array.from(atob(base64), (c: string) => c.charCodeAt(0)).buffer;
  }
}
