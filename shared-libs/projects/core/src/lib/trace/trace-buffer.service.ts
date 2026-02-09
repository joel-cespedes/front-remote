import { Injectable, OnDestroy, inject } from '@angular/core';
import { AppConfigStore } from '../config/app-config.service';
import { TraceReporterService } from './trace-reporter.service';
import { AuditEvent } from './models/trace.types';

/**
 * Service for buffering and batching trace events before sending
 * Manages automatic flushing based on size and time intervals
 */
@Injectable({ providedIn: 'root' })
export class TraceBufferService implements OnDestroy {
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Trace reporter service */
  private readonly reporter = inject(TraceReporterService);

  /* Event buffer */
  private buf: AuditEvent[] = [];
  /* Flush timer */
  private timer: number | null = null;
  /* Maximum batch size before auto-flush */
  private readonly maxBatch = 500;
  /* Flush interval in milliseconds */
  private intervalMs = 5000;

  /**
   * Starts the trace buffer service
   * Sets up page lifecycle listeners for auto-flush
   */
  start(): void {
    const c = this.cfg.config();
    if (c.trace?.audit !== true) return;
    this.intervalMs = Math.max(1000, Number(c.trace?.intervalSend ?? 5000));
    /* Don't start any timer here. Only when receiving the first event */
    window.addEventListener('pagehide', this.flushBound, { passive: true });
    window.addEventListener('beforeunload', this.flushBound, { passive: true });
  }

  /**
   * Stops the trace buffer service
   * Flushes pending events and cleans up listeners
   */
  stop(): void {
    this.clearTimer();
    /* Send pending events */
    this.flush();
    window.removeEventListener('pagehide', this.flushBound);
    window.removeEventListener('beforeunload', this.flushBound);
  }

  /**
   * Angular lifecycle hook - cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.stop();
  }

  /**
   * Adds an audit event to the buffer
   * Triggers auto-flush if buffer is full or starts timer if needed
   * @param ev - Audit event to buffer
   */
  push(ev: AuditEvent): void {
    if (this.cfg.config().trace?.audit !== true) return;

    this.buf.push(ev);
    if (this.buf.length >= this.maxBatch) {
      /* If we exceed maximum size, send immediately */
      this.flush();
      return;
    }

    /* If no timer is running, start it now */
    if (this.timer === null) {
      this.timer = window.setTimeout(this.flushBound, this.intervalMs);
    }
  }

  /**
   * Flushes all buffered events to the reporter
   * Clears buffer and timer after sending
   */
  flush = (): void => {
    /* If empty, don't send and turn off timer */
    if (this.buf.length === 0) {
      this.clearTimer();
      return;
    }

    const events = this.buf.slice();
    this.buf.length = 0;
    /* Turn off timer before sending */
    this.clearTimer();

    this.reporter.sendBatch(events);

    /* If more events come later, push() will turn on the timer again */
  };

  /**
   * Clears the flush timer
   */
  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /* Bound flush method for event listeners */
  private readonly flushBound = () => this.flush();
}
