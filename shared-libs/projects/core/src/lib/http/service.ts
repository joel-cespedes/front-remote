import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';

type Query = Record<string, string | number | boolean | null | undefined> | undefined;

/**
 * Converts query parameters object to HttpParams instance
 * @param params - Query parameters object
 * @returns HttpParams instance
 */
function toHttpParams(params: Query): HttpParams {
  let hp = new HttpParams();
  if (!params) return hp;

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      for (const vv of v) hp = hp.append(k, String(vv));
    } else {
      hp = hp.set(k, String(v));
    }
  }
  return hp;
}

/**
 * Joins base URL with path, handling trailing/leading slashes
 * @param base - Base URL
 * @param path - Path to join
 * @returns Joined URL
 */
function joinUrl(base: string, path: string): string {
  const left = base.replace(/\/+$/, '');
  const right = path.replace(/^\/+/, '');
  return `${left}/${right}`;
}

/**
 * Base Service with HttpClient and Observables.
 * Resolves baseUrl from app.config.json (apiModules) or explicit URL.
 */
export abstract class Service<T, L = T[]> {
  /* HTTP client instance */
  public readonly http = inject(HttpClient);
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Base URL for HTTP requests */
  private readonly baseUrl: string;

  /**
   * Constructor that initializes the service with module name or URL override
   * @param moduleName - Name of the API module from configuration
   * @param urlOverride - Direct URL override for the service
   */
  constructor(moduleName?: string, urlOverride?: string) {
    this.baseUrl = this.resolveBaseUrl(moduleName, urlOverride);
    if (!this.baseUrl) {
      throw new Error(
        `You need a valid URL to extend this service for '${moduleName ?? 'unknown'}'`
      );
    }
  }

  /**
   * GET collection of items
   * @param params - Optional query parameters
   * @returns Observable of collection
   */
  list(params?: Query): Observable<L> {
    const options = params ? { params: toHttpParams(params) } : undefined;
    return this.http.get<L>(this.baseUrl, options);
  }

  /**
   * GET item by ID
   * @param id - Item identifier
   * @param params - Optional query parameters
   * @returns Observable of single item
   */
  getBy(id: string | number, params?: Query): Observable<T> {
    const url = `${this.baseUrl}/${encodeURIComponent(String(id))}`;

    const options = params ? { params: toHttpParams(params) } : undefined;

    return this.http.get<T>(url, options);
  }

  /**
   * POST to create new item
   * @param item - Partial item data to create
   * @returns Observable of created item
   */
  create(item: Partial<T>): Observable<T> {
    return this.http.post<T>(this.baseUrl, item);
  }

  /**
   * PUT to update item completely
   * @param id - Item identifier
   * @param item - Complete item data
   * @returns Observable of updated item
   */
  update(id: string | number, item: T): Observable<T> {
    const url = `${this.baseUrl}/${encodeURIComponent(String(id))}`;
    return this.http.put<T>(url, item);
  }

  /**
   * PATCH to update item partially
   * @param id - Item identifier
   * @param item - Partial item data for update
   * @returns Observable of updated item
   */
  patch(id: string | number, item: Partial<T>): Observable<T> {
    const url = `${this.baseUrl}/${encodeURIComponent(String(id))}`;
    return this.http.patch<T>(url, item);
  }

  /**
   * DELETE item by ID
   * @param id - Item identifier
   * @returns Observable of void
   */
  delete(id: string | number): Observable<void> {
    const url = `${this.baseUrl}/${encodeURIComponent(String(id))}`;
    return this.http.delete<void>(url);
  }

  /**
   * Resolves base URL from config.apiModules or uses override
   * @param moduleName - Name of the API module
   * @param urlOverride - Direct URL override
   * @returns Resolved base URL
   */
  private resolveBaseUrl(moduleName?: string, urlOverride?: string): string {
    if (urlOverride) return urlOverride;
    if (!moduleName) return '';

    const app = this.cfg.config();
    if (!app) throw new Error('App config not loaded yet');

    const m = app.apiModules.find(x => x.name.toLowerCase() === moduleName.toLowerCase());
    if (!m) throw new Error(`The method '${moduleName}' does not exist in the configuration file.`);

    return joinUrl(m.baseUrl, m.path);
  }
}
export const __test__ = { toHttpParams, joinUrl };
