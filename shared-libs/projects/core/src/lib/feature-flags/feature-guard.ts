import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Creates a route guard that checks if a feature flag is enabled
 * @param key - Feature flag key to check
 * @param redirectTo - URL to redirect to if flag is disabled (default: '/')
 * @returns CanMatchFn that allows route matching only if flag is enabled
 */
export function featureCanMatch(key: string, redirectTo = '/'): CanMatchFn {
  return () => {
    /* Feature flags service instance */
    const ff = inject(FeatureFlagsService);
    return ff.isOn(key) ? true : inject(Router).parseUrl(redirectTo);
  };
}
