import { Injectable, inject } from '@angular/core';
import { LoggerReporterService } from './logger-reporter.service';

/**
 * Simple logging service wrapper
 * Provides convenient logging methods for application code
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly reporter = inject(LoggerReporterService);

  debug(message: string, context?: unknown): void {
    this.reporter.log('debug', message, context);
  }

  info(message: string, context?: unknown): void {
    this.reporter.log('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.reporter.log('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.reporter.log('error', message, context);
  }
}
