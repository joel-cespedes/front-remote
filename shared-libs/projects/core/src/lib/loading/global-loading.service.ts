import { Injectable, WritableSignal, signal } from '@angular/core';

/**
 * Service for managing global loading state
 * Provides reactive loading state using Angular signals
 */
@Injectable({ providedIn: 'root' })
export class GlobalLoadingService {
  /* Internal loading state signal */
  private readonly _loading: WritableSignal<boolean> = signal(false);
  /* Read-only loading state accessor */
  readonly loading = this._loading.asReadonly();

  /**
   * Sets the global loading state
   * @param state - Loading state to set
   */
  set(state: boolean): void {
    this._loading.set(state);
  }
}
