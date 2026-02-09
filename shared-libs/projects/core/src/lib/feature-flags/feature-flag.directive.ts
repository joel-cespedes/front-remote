import {
  Directive,
  ElementRef,
  Renderer2,
  effect,
  inject,
  input,
  booleanAttribute
} from '@angular/core';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Directive to show/hide elements based on feature flags or boolean values
 * Usage:
 *   <div ff="newCheckout"></div>         // by flag key
 *   <div [ff]="isBetaUser"></div>        // direct boolean
 *   <div ff="newCheckout" ffNot></div>   // inverts the logic
 */
@Directive({
  selector: '[ff],[ffNot]',
  standalone: true
})
export class FeatureFlagDirective {
  /* Element reference */
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  /* Renderer instance */
  private rnd = inject(Renderer2);
  /* Feature flags service */
  private svc = inject(FeatureFlagsService);

  /* Feature flag key or boolean value */
  readonly ff = input<string | boolean | null>(null);
  /* Inverts the logic when true */
  readonly ffNot = input(false, { transform: booleanAttribute });

  /**
   * Reactively applies display and aria-hidden based on feature flag state
   */
  private _apply = effect(() => {
    const v = this.ff();
    let show = true;

    if (typeof v === 'string') {
      show = this.svc.isOn(v);
    } else if (typeof v === 'boolean') {
      show = v;
    } else {
      show = true;
    }

    if (this.ffNot()) show = !show;

    const node = this.el.nativeElement;
    this.rnd.setStyle(node, 'display', show ? '' : 'none');
    this.rnd.setAttribute(node, 'aria-hidden', show ? 'false' : 'true');
  });
}
