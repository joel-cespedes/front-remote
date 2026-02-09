/* Types of trace spans */
export type SpanKind = 'route' | 'method' | 'http' | 'click' | 'custom';

export interface TraceSpan {
  /* Unique span identifier */
  spanId: string;
  /* Parent span ID for nested spans */
  parentSpanId?: string;
  /* Trace ID for the entire request flow */
  traceId: string;
  /* Type of span */
  kind: SpanKind;
  /* Human-readable span name */
  name: string;
  /* Start timestamp from performance.now() */
  startTs: number;
  /* Optional metadata */
  meta?: Record<string, unknown>;
}

export type AuditStage =
  /* Stages of audit events */
  /* Span has started */
  | 'span_start'
  /* Span has ended */
  | 'span_end'
  /* Page navigation occurred */
  | 'navigation'
  /* User clicked an element */
  | 'click'
  /* HTTP request sent */
  | 'request'
  /* HTTP response received */
  | 'response'
  /* Error occurred */
  | 'error';

export interface AuditEvent {
  /* Application name */
  appName: string;
  /* Trace identifier */
  traceId: string;
  /* Span identifier if applicable */
  spanId?: string;
  /* Parent span identifier if applicable */
  parentSpanId?: string;
  /* Span kind if applicable */
  kind?: SpanKind;
  /* Event name */
  name?: string;
  /* HTTP method if applicable */
  method?: string;
  /* URL if applicable */
  url?: string;
  /* Event stage */
  stage: AuditStage;
  /* HTTP status if applicable */
  status?: number;
  /* Duration in milliseconds if applicable */
  durationMs?: number;
  /* ISO timestamp */
  timestamp: string;
  /* Additional event data */
  extra?: Record<string, unknown>;
}
