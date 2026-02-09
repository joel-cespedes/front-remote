export interface ErrorPayload {
  /* Application name */
  appName: string;
  /* Error type */
  type: 'http' | 'js';
  /* Error message */
  message: string;
  /* Stack trace (for JS errors) */
  stack?: string;
  /* Request URL (for HTTP errors) */
  url?: string;
  /* HTTP method (for HTTP errors) */
  method?: string;
  /* HTTP status code (for HTTP errors) */
  status?: number;
  /* HTTP status text (for HTTP errors) */
  statusText?: string;
  /* ISO timestamp when error occurred */
  timestamp: string;
  /* Additional error context */
  extra?: unknown;
}
