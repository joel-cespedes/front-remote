import { Injectable, inject } from '@angular/core';
import { AppConfigStore } from '../config/app-config.service';
import { MemoryStorage, StorageLike } from './models/memory-storage';

/**
 * Service for managing namespaced browser storage
 * Handles local storage with fallback to memory storage
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Storage implementation instance */
  private readonly storage: StorageLike;
  /* Namespace for storage keys */
  private readonly ns: string;

  /**
   * Constructor that initializes storage with app namespace
   */
  constructor() {
    this.ns = this.normalizeNs(this.cfg.config().appName);
    this.storage = this.detectStorage();
  }

  /**
   * Sets a value in storage with namespace
   * @param key - Storage key
   * @param value - Value to store
   */
  set<T>(key: string, value: T): void {
    const fullKey = this.key(key);
    try {
      this.storage.setItem(fullKey, JSON.stringify(value));
    } catch {
      /* Ignore quota/serialization errors */
    }
  }

  /**
   * Gets a value from storage by key
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  get<T>(key: string): T | null {
    const fullKey = this.key(key);
    try {
      const raw = this.storage.getItem(fullKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Removes a namespaced key from storage
   * @param key - Storage key to remove
   */
  remove(key: string): void {
    this.storage.removeItem(this.key(key));
  }

  /**
   * Clears all storage
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Checks if a namespaced key exists in storage
   * @param key - Storage key to check
   * @returns Boolean indicating if key exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Creates namespaced key for storage
   * @param k - Base key
   * @returns Namespaced key
   */
  private key(k: string): string {
    return `${this.ns}:${k}`;
  }

  /**
   * Normalizes app name for use as namespace
   * @param appName - Application name
   * @returns Normalized namespace
   */
  private normalizeNs(appName: string): string {
    return appName.trim().toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Detects and returns available storage implementation
   * @returns Storage implementation (localStorage or memory fallback)
   */
  private detectStorage(): StorageLike {
    try {
      const ls = window?.localStorage as StorageLike | undefined;
      if (ls) {
        /* Basic sanity check */
        const testKey = `__test__${Math.random().toString(36).slice(2)}`;
        ls.setItem(testKey, '1');
        ls.removeItem(testKey);
        return ls;
      }
    } catch {
      /* Fall back to memory storage */
    }
    return new MemoryStorage();
  }
}
