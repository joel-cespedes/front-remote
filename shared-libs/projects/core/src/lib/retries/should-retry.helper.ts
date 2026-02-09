import { HttpRequest } from '@angular/common/http';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AppConfig } from '../config/models/app-config.types';

/**
 * Determines if a request should be retried based on configuration and context
 *
 * @param req - HTTP request
 * @param cfg - Application configuration
 * @returns Object with shouldRetry flag and retry parameters
 */
export function shouldRetry(
  req: HttpRequest<unknown>,
  cfg: AppConfig
): { shouldRetry: boolean; count: number; delay: number } {
  /* Early return checks: bypass, config disabled, count is 0, or both error reporting disabled */
  if (
    req.context.get(BYPASS_INTERCEPTORS) ||
    !cfg.http?.retries?.retriesHttpRequest ||
    !cfg.http?.retries?.maxRetries
  ) {
    return { shouldRetry: false, count: 0, delay: 0 };
  }

  const count = Math.max(0, Number(cfg.http?.retries?.maxRetries ?? 0));

  /* 4. Exclusions check: If URL is in exclusion list, skip retry */
  const exceptionsFromConfig = (cfg.http?.retries?.exceptionsHttp ?? []).filter(Boolean);
  const reporterHosts = [
    cfg.errors?.httpErrorsHost ?? '',
    cfg.errors?.jsErrorsHost ?? '',
    cfg.trace?.auditHost ?? '',
    cfg.logger?.loggersHost ?? ''
  ].filter(Boolean) as string[];

  const allExceptions = [...exceptionsFromConfig, ...reporterHosts];
  const isExcluded = allExceptions.some(pattern =>
    req.urlWithParams.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isExcluded) {
    return { shouldRetry: false, count: 0, delay: 0 };
  }

  /* 5. All checks passed: retry is allowed */
  const delay = Math.max(0, Number(cfg.http?.retries?.maxInterval ?? 0));
  return { shouldRetry: true, count, delay };
}
