import { Injector, Type, InjectionToken } from '@angular/core';

/**
 * Utility class for holding and accessing Angular injector outside of injection context
 * Useful for accessing services in decorators and other non-Angular contexts
 */
export class InjectorHolder {
  /* Static injector instance */
  private static inj: Injector | null = null;

  /**
   * Sets the injector instance to be used globally
   * @param injector - Angular injector instance
   */
  static set(injector: Injector): void {
    this.inj = injector;
  }

  /**
   * Gets a service instance from the stored injector
   * @param token - Service token or type
   * @returns Service instance
   */
  static get<T>(token: Type<T> | InjectionToken<T>): T {
    if (!this.inj) {
      throw new Error('InjectorHolder not set yet');
    }
    return this.inj.get<T>(token);
  }
}
