import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorReporterService } from './error-reporter.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AppConfigStore } from '../config/app-config.service';
import { TraceManagerService } from '../trace/trace-manager.service';

/**
 * HTTP interceptor for handling and reporting HTTP errors
 * Captures HTTP errors and reports them via ErrorReporterService
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BYPASS_INTERCEPTORS)) return next(req);

  /* Error and logger configuration */
  const { errors, logger } = inject(AppConfigStore).config();
  /* Whether error reporting is enabled */
  const enabled = errors?.httpErrors === true || logger?.loggers === true;
  if (!enabled) return next(req);

  /* Error reporter service instance */
  const reporter = inject(ErrorReporterService);
  /* Trace manager service instance */
  const tm = inject(TraceManagerService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        reporter.reportHttp({
          message: err.message || 'HTTP error',
          url: err.url ?? req.url,
          method: req.method,
          status: err.status,
          statusText: err.statusText,
          extra: {
            traceId: tm.getTraceId(),
            activeMethodSpan: tm.getActiveMethodName()
          }
        });
      }
      return throwError(() => err);
    })
  );
};
