import { Component, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';

@Component({
  selector: 'sum-datepicker',
  standalone: true,
  imports: [DatePicker, FormsModule],
  template: `
    @if (!hidden()) {
      <div class="sum-datepicker">
        @if (label()) {
          <label class="sum-datepicker__label" [for]="name()">
            {{ label() }}
            @if (required()) {
              <span class="sum-datepicker__required">*</span>
            }
          </label>
        }
        <p-datepicker
          [inputId]="name()"
          [ngModel]="value()"
          (ngModelChange)="onValueChange($event)"
          [dateFormat]="dateFormat()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [showIcon]="true"
          [appendTo]="'body'"
          [class.ng-invalid]="invalid() && touched()"
          [class.ng-dirty]="touched()"
          (onBlur)="touched.set(true)"
          styleClass="sum-datepicker__picker" />
        @if (invalid() && touched()) {
          <div class="sum-datepicker__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-datepicker__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-datepicker {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-datepicker__label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--text-primary, #333);
    }

    .sum-datepicker__required {
      color: var(--color-error, #d32f2f);
      margin-left: 2px;
    }

    :host ::ng-deep .sum-datepicker__picker {
      width: 100%;
    }

    .sum-datepicker__errors {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-datepicker__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SumDatepickerComponent implements FormValueControl<Date | null> {
  readonly value = model<Date | null>(null);
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');

  readonly label = input<string>('');
  readonly placeholder = input<string>('dd/mm/aaaa');
  readonly dateFormat = input<string>('dd/mm/yy');

  onValueChange(newValue: Date | null) {
    this.value.set(newValue);
    this.touched.set(true);
  }
}
