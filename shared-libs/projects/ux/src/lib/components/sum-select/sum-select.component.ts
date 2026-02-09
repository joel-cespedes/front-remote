import { Component, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { Select } from 'primeng/select';

@Component({
  selector: 'sum-select',
  standalone: true,
  imports: [Select, FormsModule],
  template: `
    @if (!hidden()) {
      <div class="sum-select">
        @if (label()) {
          <label class="sum-select__label" [for]="name()">
            {{ label() }}
            @if (required()) {
              <span class="sum-select__required">*</span>
            }
          </label>
        }
        <p-select
          [inputId]="name()"
          [options]="options()"
          [optionLabel]="optionLabel()"
          [optionValue]="optionValue()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [filter]="filter()"
          [showClear]="showClear()"
          [ngModel]="value()"
          (ngModelChange)="onValueChange($event)"
          [class.ng-invalid]="invalid() && touched()"
          [class.ng-dirty]="touched()"
          (onBlur)="touched.set(true)"
          styleClass="sum-select__dropdown" />
        @if (invalid() && touched()) {
          <div class="sum-select__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-select__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-select {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-select__label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--text-primary, #333);
    }

    .sum-select__required {
      color: var(--color-error, #d32f2f);
      margin-left: 2px;
    }

    :host ::ng-deep .sum-select__dropdown {
      width: 100%;
    }

    .sum-select__errors {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-select__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumSelectComponent implements FormValueControl<unknown> {
  readonly value = model<unknown>(null);
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input<string>('label');
  readonly optionValue = input<string>('value');
  readonly filter = input<boolean>(false);
  readonly showClear = input<boolean>(false);

  onValueChange(newValue: unknown) {
    this.value.set(newValue);
    this.touched.set(true);
  }
}
