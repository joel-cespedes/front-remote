import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { LoggerReporterService } from './logger-reporter.service';

/**
 * HTTP interceptor for logging request and response information
 * Logs HTTP method, URL, status, and timing information
 */
export const loggerInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BYPASS_INTERCEPTORS)) return next(req);

  /* Logger configuration */
  const { logger } = inject(AppConfigStore).config();
  if (!logger?.loggers) return next(req);

  /* Logger reporter service instance */
  const reporter = inject(LoggerReporterService);
  /* Request start time */
  const started = performance.now();

  reporter.log('info', `HTTP ${req.method} → ${req.urlWithParams}`);

  return next(req).pipe(
    tap({
      next: evt => {
        if (evt instanceof HttpResponse) {
          reporter.log(
            'info',
            `HTTP ${req.method} ← ${req.urlWithParams} [${evt.status}] ${Math.round(performance.now() - started)}ms`
          );
        }
      },
      error: () => {
        /* Error handling in separate error interceptor */
      }
    })
  );
};
