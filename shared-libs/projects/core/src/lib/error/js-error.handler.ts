import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AppConfigStore } from '../config/app-config.service';
import { ErrorReporterService } from './error-reporter.service';

/**
 * Global JavaScript error handler
 * Catches unhandled JavaScript errors and reports them via ErrorReporterService
 */
@Injectable()
export class JsErrorHandler implements ErrorHandler {
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Error reporter service */
  private readonly reporter = inject(ErrorReporterService);

  /**
   * Handles unhandled JavaScript errors
   * @param error - Error object to handle
   */
  handleError(error: unknown): void {
    /* Don't report HTTP errors here: they're handled by the interceptor */
    if (error instanceof HttpErrorResponse) return;

    const { errors, logger } = this.cfg.config();
    /* Whether JS error reporting is enabled */
    const enabled = errors?.jsErrors === true || logger?.loggers === true;

    if (enabled) {
      this.reporter.reportJs(error);
    } else {
      console.error(error);
    }

    this.reporter.reportJs(error);
  }
}
