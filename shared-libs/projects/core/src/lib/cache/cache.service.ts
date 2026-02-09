import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigStore } from '../config/app-config.service';

interface Entry {
  /* HTTP response object */
  res: HttpResponse<unknown>;
  /* Timestamp when entry was cached */
  t: number;
}

/**
 * Service for managing HTTP response caching
 * Stores and retrieves cached HTTP responses based on configuration
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Cache storage map */
  private readonly map = new Map<string, Entry>();

  /**
   * Retrieves cached response for HTTP request
   * @param req - HTTP request object
   * @returns Cached HTTP response or null if not found/expired
   */
  get(req: HttpRequest<unknown>): HttpResponse<unknown> | null {
    const { cache, maxAge, cacheableUrls } = this.cfg.config().cache;
    if (!cache) return null;

    const key = req.urlWithParams;
    if (!this.allowed(key, cacheableUrls)) return null;

    const e = this.map.get(key);
    if (!e) return null;

    if (Date.now() - e.t > maxAge) {
      this.map.delete(key);
      return null;
    }
    return e.res as HttpResponse<unknown>;
  }

  /**
   * Stores HTTP response in cache
   * @param req - HTTP request object
   * @param res - HTTP response to cache
   */
  put(req: HttpRequest<unknown>, res: HttpResponse<unknown>): void {
    const { cache, cacheableUrls } = this.cfg.config().cache;
    if (!cache) return;

    const key = req.urlWithParams;
    if (!this.allowed(key, cacheableUrls)) return;

    this.map.set(key, { res, t: Date.now() });
  }

  /**
   * Invalidates cached response for specific URL
   * @param urlWithParams - URL with parameters to invalidate
   */
  invalidateUrl(urlWithParams: string): void {
    this.map.delete(urlWithParams);
  }

  /**
   * Invalidates all cached responses with URLs starting with prefix
   * @param prefix - URL prefix to match for invalidation
   */
  invalidateByPrefix(prefix: string): void {
    for (const k of this.map.keys()) if (k.startsWith(prefix)) this.map.delete(k);
  }

  /**
   * Clears all cached responses
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Checks if URL is allowed for caching based on configuration
   * @param urlWithParams - URL with parameters to check
   * @param allow - Array of allowed URL patterns
   * @returns Boolean indicating if URL is allowed for caching
   */
  private allowed(urlWithParams: string, allow: string[]): boolean {
    /* Empty array means no caching */
    if (!allow || allow.length === 0) return false;
    const u = urlWithParams.toLowerCase();
    return allow.some(token => u.includes(token.toLowerCase()));
  }
}
