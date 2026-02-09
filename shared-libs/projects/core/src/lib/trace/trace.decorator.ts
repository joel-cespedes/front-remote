import { InjectorHolder } from '../helpers/injector-holder';
import { TraceManagerService } from './trace-manager.service';

/**
 * Decorator for tracing method execution with automatic span generation
 * Usage: @Trace('FriendlyName', meta) to wrap methods and generate 'method' spans
 * @param name - Optional friendly name for the span
 * @param meta - Optional metadata to include with the span
 * @returns Method decorator
 */
export function Trace(name?: string, meta?: Record<string, unknown>) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (...args: unknown[]) {
      const tm = InjectorHolder.get<TraceManagerService>(TraceManagerService);
      const spanName = name ?? `${target.constructor?.name ?? 'Unknown'}.${propertyKey}`;
      const sp = tm.startSpan(spanName, 'method', meta);

      try {
        const ret = original.apply(this, args);
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          return (ret as Promise<unknown>)
            .then(r => {
              tm.endSpan(sp);
              return r;
            })
            .catch(e => {
              tm.endSpan(sp, { error: safeString(e) });
              throw e;
            });
        } else {
          tm.endSpan(sp);
          return ret;
        }
      } catch (e) {
        tm.endSpan(sp, { error: safeString(e) });
        throw e;
      }
    };

    return descriptor;
  };
}

/**
 * Safely converts unknown value to string for error logging
 * @param x - Value to convert
 * @returns String representation
 */
function safeString(x: unknown): string {
  try {
    return typeof x === 'string' ? x : JSON.stringify(x);
  } catch {
    return String(x);
  }
}
