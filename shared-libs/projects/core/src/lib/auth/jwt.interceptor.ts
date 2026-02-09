import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigStore } from '../config/app-config.service';
import { BYPASS_INTERCEPTORS } from '../http/tokens';
import { AuthTokenService } from './auth-token.service';

/**
 * Checks if URL should be excluded from JWT token addition
 * @param urlWithParams - URL with query parameters
 * @param patterns - Array of URL patterns to exclude
 * @returns Boolean indicating if URL should be excluded
 */
function isExcluded(urlWithParams: string, patterns: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return false;
  const u = urlWithParams.toLowerCase();
  return patterns.some(p => u.includes(String(p).toLowerCase()));
}

/**
 * HTTP interceptor for adding JWT tokens to requests
 * Automatically adds Authorization header with Bearer token
 */
export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BYPASS_INTERCEPTORS)) return next(req);

  /* Application configuration */
  const cfg = inject(AppConfigStore).config();
  /* Whether to add JWT token */
  const add = cfg.http?.addTokenJwt === true;
  /* URLs to exclude from token addition */
  const excludes = cfg.http?.excludeTokenJwt ?? [];

  if (!add) return next(req);

  /* Token service instance */
  const tokenSvc = inject(AuthTokenService);
  /* Current JWT token */
  const token = tokenSvc.get();
  if (!token) return next(req);

  if (isExcluded(req.urlWithParams, excludes)) return next(req);

  /* Clone request with auth header */
  const authReq: HttpRequest<unknown> = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
