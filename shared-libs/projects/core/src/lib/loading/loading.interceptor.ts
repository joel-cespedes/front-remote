import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AppConfigStore } from '../config/app-config.service';
import { GlobalLoadingService } from './global-loading.service';

/* Counter for active requests (concurrency) */
let countRequest = 0;

/**
 * Resets request counter for testing purposes
 * @returns Current request count (should be 0)
 */
export function resetCountForTests() {
  countRequest = 0;
  return countRequest;
}

/**
 * Loading interceptor controlled by configuration:
 * - Active only if appConfig.globalLoading === true
 * - Respects BYPASS_INTERCEPTORS via HttpContext
 * - Doesn't touch DOM: only exposes state via GlobalLoadingService
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  /* Throws if not loaded; AppInitializer guarantees it */
  const cfg = inject(AppConfigStore).config();
  /* Whether global loading is enabled */
  const enabled = cfg.globalLoading === true;

  if (!enabled || req.context.get(BYPASS_INTERCEPTORS)) {
    return next(req);
  }

  /* Global loading service instance */
  const loading = inject(GlobalLoadingService);

  countRequest++;
  if (countRequest === 1) {
    /* First request in flight → activate global loading */
    loading.set(true);
  }

  return next(req).pipe(
    finalize(() => {
      countRequest--;
      if (countRequest === 0) {
        /* Last request finished → turn off global loading */
        loading.set(false);
      }
    })
  );
};
