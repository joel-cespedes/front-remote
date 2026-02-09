import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { retry } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { shouldRetry } from './should-retry.helper';

/**
 * HTTP interceptor for handling request retries
 * Automatically retries failed requests based on configuration
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  /* Get configuration */
  const cfg = inject(AppConfigStore).config();

  /* Determine if request should be retried */
  const { shouldRetry: allowRetry, count, delay } = shouldRetry(req, cfg);

  /* If retry is not allowed, pass through */
  if (!allowRetry) {
    return next(req);
  }

  /* Apply retry logic */
  return next(req).pipe(
    retry({
      count,
      delay
    })
  );
};
