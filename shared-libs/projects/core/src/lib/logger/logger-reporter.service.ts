import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { take, catchError, EMPTY } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';

export interface LogEvent {
  appName: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: unknown;
}

/**
 * Service for reporting log events to console and remote endpoints
 * Handles structured logging with optional remote transmission
 */
@Injectable({ providedIn: 'root' })
export class LoggerReporterService {
  /* HTTP client instance */
  private readonly http = inject(HttpClient);
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);

  /**
   * Logs a message to console and optionally sends to remote endpoint
   * @param level - Log level (debug, info, warn, error)
   * @param message - Log message
   * @param context - Optional context data
   */
  log(level: LogEvent['level'], message: string, context?: unknown): void {
    const { logger, appName } = this.cfg.config();

    /* Optional console logging */
    if (logger?.loggers) {
      console[level === 'debug' ? 'debug' : level](`[${appName}] ${message}`, context ?? '');
    }

    /* Optional remote logging */
    if (logger?.loggers && logger?.loggersHost) {
      const payload: LogEvent = {
        appName,
        level,
        message,
        timestamp: new Date().toISOString(),
        context
      };

      this.http
        .post(logger.loggersHost, payload, {
          context: new HttpContext().set(BYPASS_INTERCEPTORS, true)
        })
        .pipe(
          take(1),
          catchError(() => EMPTY)
        )
        .subscribe();
    }
  }
}
