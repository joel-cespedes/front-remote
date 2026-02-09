/* Minimal API we need (compatible with window.localStorage) */
export interface StorageLike {
  /* Retrieves item by key */
  getItem(key: string): string | null;
  /* Stores item with key */
  setItem(key: string, value: string): void;
  /* Removes item by key */
  removeItem(key: string): void;
  /* Clears all stored items */
  clear(): void;
}

/**
 * In-memory storage implementation (fallback for SSR or environments without localStorage)
 * Provides localStorage-compatible API using Map for storage
 */
export class MemoryStorage implements StorageLike {
  /* Internal storage map */
  private data = new Map<string, string>();

  /**
   * Retrieves stored value by key
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  /**
   * Stores value with key
   * @param key - Storage key
   * @param value - Value to store
   */
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  /**
   * Removes stored value by key
   * @param key - Storage key to remove
   */
  removeItem(key: string): void {
    this.data.delete(key);
  }

  /**
   * Clears all stored data
   */
  clear(): void {
    this.data.clear();
  }
}
