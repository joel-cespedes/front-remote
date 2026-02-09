import { Injectable, inject } from '@angular/core';
import { StorageService } from '../storage/storage.service';

/**
 * Service for managing authentication tokens
 * Provides methods to store, retrieve, and manage auth tokens
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  /* Storage service instance */
  private readonly storage = inject(StorageService);
  /* Storage key for auth token */
  private readonly KEY = 'auth-app';

  /**
   * Gets the stored authentication token
   * @returns Authentication token or null if not found
   */
  get(): string | null {
    return this.storage.get<string>(this.KEY);
  }

  /**
   * Sets the authentication token in storage
   * @param token - Authentication token to store
   */
  set(token: string): void {
    this.storage.set(this.KEY, token);
  }

  /**
   * Clears the authentication token from storage
   */
  clear(): void {
    this.storage.remove(this.KEY);
  }

  /**
   * Checks if authentication token exists
   * @returns Boolean indicating if token exists
   */
  has(): boolean {
    return this.get() !== null;
  }
}
