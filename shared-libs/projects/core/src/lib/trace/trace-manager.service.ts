import { Injectable, inject } from '@angular/core';
import { TraceBufferService } from './trace-buffer.service';
import { SpanKind, TraceSpan } from './models/trace.types';
import { AppConfigStore } from '../config/app-config.service';

/**
 * Generates a UUID v4 string
 * @returns UUID v4 formatted string
 */
function uuid(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  /* UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx) */
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const b2h = (b: number) => b.toString(16).padStart(2, '0');
  const s = Array.from(arr, b2h).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/**
 * Service for managing distributed tracing spans and trace context
 * Handles span lifecycle, stack management, and trace ID generation
 */
@Injectable({ providedIn: 'root' })
export class TraceManagerService {
  /* Trace buffer service */
  private readonly buf = inject(TraceBufferService);
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);

  /* Active span stack */
  private readonly stack: TraceSpan[] = [];
  /* Session-wide trace ID */
  private sessionTraceId = uuid();

  /**
   * Gets the current session trace ID
   * @returns Session trace ID
   */
  getTraceId(): string {
    return this.sessionTraceId;
  }

  /**
   * Gets the currently active span (top of stack)
   * @returns Active span or undefined if stack is empty
   */
  getActiveSpan(): TraceSpan | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Starts a new span and makes it active
   * @param name - Span name
   * @param kind - Span kind (method, http, etc.)
   * @param meta - Optional metadata
   * @returns Created span
   */
  startSpan(name: string, kind: SpanKind, meta?: Record<string, unknown>): TraceSpan {
    const now = performance.now();
    const parent = this.getActiveSpan();
    const span: TraceSpan = {
      spanId: uuid(),
      parentSpanId: parent?.spanId,
      traceId: this.sessionTraceId,
      kind,
      name,
      startTs: now,
      meta
    };
    this.stack.push(span);

    this.buf.push({
      appName: this.cfg.config().appName,
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      kind: span.kind,
      name: span.name,
      stage: 'span_start',
      timestamp: new Date().toISOString(),
      extra: meta
    });

    return span;
  }

  /**
   * Ends the specified span (or active span if it matches)
   * @param span - Span to end
   * @param extra - Optional extra data to include
   */
  endSpan(span: TraceSpan, extra?: Record<string, unknown>): void {
    /* Remove from stack if it's the active span */
    const active = this.getActiveSpan();
    if (active?.spanId === span.spanId) {
      this.stack.pop();
    } else {
      /* If not active, remove it from wherever it is in the stack */
      const idx = this.stack.findIndex(s => s.spanId === span.spanId);
      if (idx >= 0) this.stack.splice(idx, 1);
    }

    const duration = Math.round(performance.now() - span.startTs);
    this.buf.push({
      appName: this.cfg.config().appName,
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      kind: span.kind,
      name: span.name,
      stage: 'span_end',
      durationMs: duration,
      timestamp: new Date().toISOString(),
      extra
    });
  }

  /**
   * Convenience method: executes function within a span and closes it at the end (sync/async)
   * @param name - Span name
   * @param kind - Span kind
   * @param fn - Function to execute within span
   * @param meta - Optional metadata
   * @returns Function result
   */
  async runWithSpan<T>(
    name: string,
    kind: SpanKind,
    fn: () => T | Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const sp = this.startSpan(name, kind, meta);
    try {
      const result = await fn();
      this.endSpan(sp);
      return result;
    } catch (e) {
      this.endSpan(sp, { error: this.safeString(e) });
      throw e;
    }
  }

  /**
   * Gets the active method span name for error enrichment
   * @returns Active method span name or undefined
   */
  getActiveMethodName(): string | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].kind === 'method') return this.stack[i].name;
    }
    return undefined;
  }

  /**
   * Safely converts unknown value to string
   * @param x - Value to convert
   * @returns String representation
   */
  private safeString(x: unknown): string {
    try {
      return typeof x === 'string' ? x : JSON.stringify(x);
    } catch {
      return String(x);
    }
  }
}
