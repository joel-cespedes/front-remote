import { Component, model, input, ChangeDetectionStrategy } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { Textarea } from 'primeng/textarea';

@Component({
  selector: 'sum-textarea',
  standalone: true,
  imports: [Textarea],
  template: `
    @if (!hidden()) {
      <div class="sum-textarea">
        @if (label()) {
          <label class="sum-textarea__label" [for]="name()">
            {{ label() }}
            @if (required()) {
              <span class="sum-textarea__required">*</span>
            }
          </label>
        }
        <textarea
          pTextarea
          [id]="name()"
          [value]="value()"
          (input)="onInput($event)"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [placeholder]="placeholder()"
          [rows]="rows()"
          [attr.maxlength]="maxlength()"
          [autoResize]="autoResize()"
          [class.ng-invalid]="invalid() && touched()"
          [class.ng-dirty]="touched()"
          (blur)="touched.set(true)"></textarea>
        @if (invalid() && touched()) {
          <div class="sum-textarea__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-textarea__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-textarea {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-textarea__label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--text-primary, #333);
    }

    .sum-textarea__required {
      color: var(--color-error, #d32f2f);
      margin-left: 2px;
    }

    .sum-textarea textarea {
      width: 100%;
    }

    .sum-textarea__errors {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-textarea__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumTextareaComponent implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input<number>(3);
  readonly maxlength = input<number | undefined>(undefined);
  readonly autoResize = input<boolean>(false);

  onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
  }
}
