import { Injectable, signal, computed } from '@angular/core';
import { AppConfig } from './models/app-config.types';

/**
 * Store for application configuration
 * Manages loading and accessing app configuration from JSON file
 */
@Injectable({ providedIn: 'root' })
export class AppConfigStore {
  /* Internal config signal, nullable while loading */
  private readonly _config = signal<AppConfig | null>(null);

  /* Non-nullable config accessor */
  readonly config = computed<AppConfig>(() => {
    const c = this._config();
    if (!c) throw new Error('AppConfig not loaded yet');
    return c;
  });

  /* Loading state indicator */
  readonly ready = computed(() => this._config() !== null);

  /**
   * Loads application configuration from URL
   * @param url - Configuration file URL (defaults to '/config/app.config.json')
   */
  async load(url = '/config/app.config.json'): Promise<void> {
    const finalUrl = new URL(url, document.baseURI).toString();
    const res = await fetch(finalUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Config ${res.status}: ${await res.text().catch(() => '')}`);
    this._config.set((await res.json()) as AppConfig);
  }
}
