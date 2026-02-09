import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, EMPTY, take } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { ErrorPayload } from './models/error-payload.model';

/**
 * Service for reporting application errors
 * Handles both HTTP and JavaScript errors with logging and remote reporting
 */
@Injectable({ providedIn: 'root' })
export class ErrorReporterService {
  /* HTTP client instance */
  private readonly http = inject(HttpClient);
  /* Application configuration store */
  private readonly appConfigStore = inject(AppConfigStore);

  /**
   * Reports error payload to console and/or remote endpoint
   * @param payload - Error payload to report
   */
  report(payload: ErrorPayload): void {
    const { logger, errors } = this.appConfigStore.config();

    if (logger?.loggers) {
      console.group?.(`⛑️ ${payload.type.toUpperCase()} ERROR @ ${payload.appName}`);
      console.error(payload);
      console.groupEnd?.();
    }

    /* Bypass interceptors for error reporting */
    const ctx = new HttpContext().set(BYPASS_INTERCEPTORS, true);

    if (payload.type === 'http' && errors?.httpErrors && errors?.httpErrorsHost) {
      this.http
        .post(errors.httpErrorsHost, payload, { context: ctx })
        .pipe(
          take(1),
          catchError(() => EMPTY)
        )
        .subscribe();
    } else if (payload.type === 'js' && errors?.jsErrors && errors?.jsErrorsHost) {
      this.http
        .post(errors.jsErrorsHost, payload, { context: ctx })
        .pipe(
          take(1),
          catchError(() => EMPTY)
        )
        .subscribe();
    }
  }

  /**
   * Reports HTTP error with structured parameters
   * @param params - HTTP error parameters
   */
  reportHttp(params: {
    message: string;
    url?: string;
    method?: string;
    status?: number;
    statusText?: string;
    extra?: unknown;
  }): void {
    this.report(this.buildHttpPayload(params));
  }

  /**
   * Reports JavaScript error
   * @param err - JavaScript error object
   */
  reportJs(err: unknown): void {
    this.report(this.buildJsPayload(err));
  }

  /**
   * Builds HTTP error payload from parameters
   * @param p - HTTP error parameters
   * @returns Structured error payload
   */
  buildHttpPayload(p: {
    message: string;
    url?: string;
    method?: string;
    status?: number;
    statusText?: string;
    extra?: unknown;
  }): ErrorPayload {
    const { appName } = this.appConfigStore.config();
    return { appName, type: 'http', timestamp: new Date().toISOString(), ...p };
  }

  /**
   * Builds JavaScript error payload from error object
   * @param err - JavaScript error object
   * @returns Structured error payload
   */
  buildJsPayload(err: unknown): ErrorPayload {
    const { appName } = this.appConfigStore.config();
    return {
      appName,
      type: 'js',
      timestamp: new Date().toISOString(),
      message: err instanceof Error ? err.message : typeof err === 'string' ? err : safeString(err),
      stack: err instanceof Error ? (err.stack ?? undefined) : undefined
    };
  }
}

/**
 * Safely converts unknown value to string
 * @param x - Value to convert
 * @returns String representation of value
 */
function safeString(x: unknown): string {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}
