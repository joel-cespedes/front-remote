import { Component, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { ToggleSwitch } from 'primeng/toggleswitch';

@Component({
  selector: 'sum-toggle',
  standalone: true,
  imports: [ToggleSwitch, FormsModule],
  template: `
    @if (!hidden()) {
      <div class="sum-toggle">
        <p-toggleswitch
          [inputId]="name()"
          [ngModel]="checked()"
          (ngModelChange)="onCheckedChange($event)"
          [disabled]="disabled()"
          (onBlur)="touched.set(true)" />
        @if (label()) {
          <label class="sum-toggle__label" [for]="name()">{{ label() }}</label>
        }
        @if (invalid() && touched()) {
          <div class="sum-toggle__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-toggle__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-toggle {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .sum-toggle__label {
      font-size: var(--font-size-base, 1rem);
      color: var(--text-primary, #333);
      cursor: pointer;
    }

    .sum-toggle__errors {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-toggle__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumToggleComponent implements FormCheckboxControl {
  readonly checked = model<boolean>(false);
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly name = input<string>('');

  readonly label = input<string>('');

  onCheckedChange(value: boolean) {
    this.checked.set(value);
    this.touched.set(true);
  }
}
