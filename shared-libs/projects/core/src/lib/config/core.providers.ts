import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  ErrorHandler,
  Injector
} from '@angular/core';
import { AppConfigStore } from './app-config.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { cacheInterceptor } from '../cache/cache.interceptor';
import { loadingInterceptor } from '../loading/loading.interceptor';
import { httpErrorInterceptor } from '../error/http-error.interceptor';
import { JsErrorHandler } from '../error/js-error.handler';
import { retryInterceptor } from '../retries/retry.interceptor';
import { jwtAuthInterceptor } from '../auth/jwt.interceptor';
import { InjectorHolder } from '../helpers/injector-holder';
import { TraceAutoTrackerService } from '../trace/trace-auto-tracker.service';
import { traceInterceptor } from '../trace/trace.interceptor';
import { loggerInterceptor } from '../logger/logger.interceptor';

/**
 * Provides core configuration and sets up all interceptors and services
 * @param opts - Configuration options
 * @param opts.url - URL to load app configuration from
 * @returns Environment providers for core functionality
 */
export function provideCoreConfig(opts?: { url?: string }): EnvironmentProviders {
  /* Default config URL */
  const url = opts?.url ?? '/config/app.config.json';

  return makeEnvironmentProviders([
    provideAppInitializer(async () => {
      /* App config store */
      const store = inject(AppConfigStore);
      /* Injector instance */
      const inj = inject(Injector);
      /* Auto tracker service */
      const tracker = inject(TraceAutoTrackerService);
      /* Set global injector */
      InjectorHolder.set(inj);
      /* Load configuration */
      await store.load(url);
      const cfg = store.config();
      if (cfg.trace?.audit === true) {
        /* Start auto tracking if enabled */
        tracker.start();
      }
    }),
    provideHttpClient(
      withInterceptors([
        /* HTTP response caching */
        cacheInterceptor,
        /* Global loading state */
        loadingInterceptor,
        /* JWT token authentication */
        jwtAuthInterceptor,
        /* Distributed tracing */
        traceInterceptor,
        /* Request/response logging */
        loggerInterceptor,
        /* Error reporting */
        httpErrorInterceptor,
        /* Request retry logic */
        retryInterceptor
      ])
    ),
    /* Global JS error handler */
    { provide: ErrorHandler, useClass: JsErrorHandler }
  ]);
}
