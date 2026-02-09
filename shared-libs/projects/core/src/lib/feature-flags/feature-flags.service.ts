import { Injectable, computed, inject, signal } from '@angular/core';
import { AppConfigStore } from '../config/app-config.service';

/* Type definition for feature flags map */
export type FlagMap = Record<string, boolean>;

/**
 * Service for managing feature flags
 * Provides reactive feature flag state management with configuration loading
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  /* Application configuration store */
  private readonly store = inject(AppConfigStore);

  /* Reactive flag state */
  private readonly _flags = signal<FlagMap>({});
  /* Read-only flag accessor */
  readonly flags = computed(() => this._flags());

  /**
   * Constructor that initializes flags from app.config.json if available
   */
  constructor() {
    /* Initialize from app.config.json if featureFlags exist */
    try {
      const cfg = this.store.config() as unknown as { featureFlags?: FlagMap };
      if (cfg.featureFlags) this._flags.set({ ...cfg.featureFlags });
    } catch {
      /* AppConfig not loaded yet (tests/early startup) -> no problem */
    }
  }

  /**
   * Checks if a feature flag is enabled
   * @param key - Feature flag key
   * @returns Boolean indicating if flag is on
   */
  isOn(key: string): boolean {
    return this._flags()[key] === true;
  }

  /**
   * Checks if a feature flag is disabled
   * @param key - Feature flag key
   * @returns Boolean indicating if flag is off
   */
  isOff(key: string): boolean {
    return !this.isOn(key);
  }

  /**
   * Sets a feature flag value
   * @param key - Feature flag key
   * @param value - Flag value to set
   */
  set(key: string, value: boolean): void {
    const curr = this._flags();
    if (curr[key] === value) return;
    this._flags.set({ ...curr, [key]: value });
  }

  /**
   * Toggles a feature flag value
   * @param key - Feature flag key to toggle
   */
  toggle(key: string): void {
    const curr = this._flags();
    this._flags.set({ ...curr, [key]: !curr[key] });
  }

  /**
   * Loads a complete flag map, replacing current flags
   * @param map - Feature flag map to load
   */
  load(map: FlagMap): void {
    this._flags.set({ ...map });
  }

  /**
   * Gets all current feature flags
   * @returns Complete feature flag map
   */
  all(): FlagMap {
    return this._flags();
  }
}
