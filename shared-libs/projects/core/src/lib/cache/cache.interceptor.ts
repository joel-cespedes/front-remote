import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { CacheService } from './cache.service';
import { AppConfigStore } from '../config/app-config.service';

/**
 * Determines if a URL is cacheable based on allowed URL patterns
 * @param urlWithParams - URL with query parameters
 * @param allow - Array of allowed URL patterns
 * @returns Boolean indicating if URL is cacheable
 */
function isCacheable(urlWithParams: string, allow: string[]): boolean {
  /* Empty array means no caching */
  if (!allow || allow.length === 0) return false;
  const u = urlWithParams.toLowerCase();
  return allow.some(piece => u.includes(piece.toLowerCase()));
}

/**
 * HTTP interceptor for caching GET requests
 * Caches responses based on configuration and URL patterns
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);

  /* Cache configuration */
  const { cache, cacheableUrls } = inject(AppConfigStore).config().cache;
  if (!cache) return next(req);
  if (!isCacheable(req.urlWithParams, cacheableUrls)) return next(req);

  /* Cache service instance */
  const store = inject(CacheService);

  /* Check for cached response */
  const hit = store.get(req);
  if (hit) {
    return of(hit.clone());
  }

  return next(req).pipe(
    tap(evt => {
      if (evt instanceof HttpResponse) {
        /* Store response in cache */
        store.put(req, evt);
      }
    })
  );
};
