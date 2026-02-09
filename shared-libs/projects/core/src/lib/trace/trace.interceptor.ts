import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { TraceManagerService } from './trace-manager.service';

/**
 * HTTP interceptor for distributed tracing
 * Adds trace headers and creates spans for HTTP requests
 */
export const traceInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BYPASS_INTERCEPTORS)) return next(req);

  /* Application configuration */
  const cfg = inject(AppConfigStore).config();
  if (cfg.trace?.audit !== true) return next(req);

  /* Trace manager service */
  const tm = inject(TraceManagerService);
  /* Start HTTP span */
  const sp = tm.startSpan(`HTTP ${req.method}`, 'http', { url: req.urlWithParams });

  /* Clone request with trace headers */
  const reqWithIds = req.clone({
    setHeaders: {
      'X-Trace-Id': sp.traceId,
      'X-Span-Id': sp.spanId
    }
  });

  return next(reqWithIds).pipe(
    tap({
      next: evt => {
        if (evt instanceof HttpResponse) {
          /* End span with status */
          tm.endSpan(sp, { status: evt.status });
        }
      },
      error: e => {
        /* End span with error */
        tm.endSpan(sp, { error: e instanceof Error ? e.message : String(e) });
      }
    })
  );
};
