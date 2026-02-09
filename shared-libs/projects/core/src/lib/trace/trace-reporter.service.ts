import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, EMPTY, take } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AuditEvent } from './models/trace.types';

/**
 * Service for sending trace events to remote audit endpoints
 * Handles individual events and batched event transmission
 */
@Injectable({ providedIn: 'root' })
export class TraceReporterService {
  /* HTTP client instance */
  private readonly http = inject(HttpClient);
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);

  /**
   * Sends a single audit event to the remote endpoint
   * @param event - Audit event to send
   */
  send(event: AuditEvent): void {
    const { trace } = this.cfg.config();
    if (!trace?.audit || !trace?.auditHost) return;
    this.http
      .post(trace.auditHost, event, {
        context: new HttpContext().set(BYPASS_INTERCEPTORS, true)
      })
      .pipe(
        take(1),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  /**
   * Sends a batch of audit events to the remote endpoint
   * @param events - Array of audit events to send
   */
  sendBatch(events: AuditEvent[]): void {
    if (!events.length) return;
    const { trace } = this.cfg.config();
    if (!trace?.audit || !trace?.auditHost) return;
    this.http
      .post(trace.auditHost, events, {
        context: new HttpContext().set(BYPASS_INTERCEPTORS, true)
      })
      .pipe(
        take(1),
        catchError(() => EMPTY)
      )
      .subscribe();
  }
}
