import { Component, model, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'sum-input',
  standalone: true,
  imports: [InputText],
  template: `
    @if (!hidden()) {
      <div class="sum-input">
        @if (label()) {
          <label class="sum-input__label" [for]="name()">
            {{ label() }}
            @if (required()) {
              <span class="sum-input__required">*</span>
            }
          </label>
        }
        <div class="sum-input__container">
          <input
            pInputText
            [id]="name()"
            [type]="currentType()"
            [value]="value()"
            (input)="onInput($event)"
            [disabled]="disabled()"
            [readonly]="readonly()"
            [placeholder]="placeholder()"
            [class.ng-invalid]="invalid() && touched()"
            [class.ng-dirty]="touched()"
            (blur)="touched.set(true)" />
          @if (type() === 'password') {
            <button
              type="button"
              class="sum-input__toggle"
              (click)="togglePassword()"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <i [class]="showPassword() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
            </button>
          }
        </div>
        @if (invalid() && touched()) {
          <div class="sum-input__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-input__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-input {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-input__label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--text-primary, #333);
    }

    .sum-input__required {
      color: var(--color-error, #d32f2f);
      margin-left: 2px;
    }

    .sum-input__container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .sum-input__container input {
      width: 100%;
    }

    .sum-input__container input[type='password'],
    .sum-input__container input.sum-input--password-visible {
      padding-right: 40px;
    }

    .sum-input__toggle {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary, #666);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sum-input__toggle:hover {
      color: var(--color-primary, #0088c6);
    }

    .sum-input__errors {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-input__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumInputComponent implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');

  readonly type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url'>('text');
  readonly label = input<string>('');
  readonly placeholder = input<string>('');

  readonly showPassword = signal(false);

  readonly currentType = computed(() => {
    if (this.type() === 'password' && this.showPassword()) {
      return 'text';
    }
    return this.type();
  });

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }
}
