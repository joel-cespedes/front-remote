import {
  Component,
  model,
  input,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import type { ValidationError } from '@angular/forms/signals';
import { Button } from 'primeng/button';

@Component({
  selector: 'sum-attach',
  standalone: true,
  imports: [Button],
  template: `
    @if (!hidden()) {
      <div class="sum-attach">
        @if (label()) {
          <label class="sum-attach__label" [for]="name()">
            {{ label() }}
            @if (required()) {
              <span class="sum-attach__required">*</span>
            }
          </label>
        }
        <div
          class="sum-attach__dropzone"
          [class.sum-attach__dropzone--dragover]="isDragOver()"
          [class.sum-attach__dropzone--disabled]="disabled()"
          role="button"
          tabindex="0"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="openFileDialog()"
          (keydown.enter)="openFileDialog()"
          (keydown.space)="openFileDialog()">
          <input
            #fileInput
            type="file"
            [accept]="accept()"
            [multiple]="multiple()"
            [disabled]="disabled()"
            (change)="onFileSelected($event)"
            class="sum-attach__input" />
          <i class="pi pi-upload sum-attach__icon"></i>
          <span class="sum-attach__text">
            {{ placeholder() || 'Arrastra archivos aquí o haz clic para seleccionar' }}
          </span>
        </div>

        @if (files().length > 0) {
          <ul class="sum-attach__file-list">
            @for (file of files(); track file.name; let i = $index) {
              <li class="sum-attach__file-item">
                <i class="pi pi-file"></i>
                <span class="sum-attach__file-name">{{ file.name }}</span>
                <span class="sum-attach__file-size">({{ formatSize(file.size) }})</span>
                <button
                  type="button"
                  class="sum-attach__file-remove"
                  (click)="removeFile(i, $event)"
                  [disabled]="disabled()">
                  <i class="pi pi-times"></i>
                </button>
              </li>
            }
          </ul>
        }

        @if (invalid() && touched()) {
          <div class="sum-attach__errors" role="alert">
            @for (error of errors(); track error) {
              <small class="sum-attach__error">{{ error.message }}</small>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .sum-attach {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-attach__label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--text-primary, #333);
    }

    .sum-attach__required {
      color: var(--color-error, #d32f2f);
      margin-left: 2px;
    }

    .sum-attach__input {
      display: none;
    }

    .sum-attach__dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      border: 2px dashed var(--surface-border, #e0e0e0);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      transition:
        border-color 0.2s,
        background-color 0.2s;
    }

    .sum-attach__dropzone:hover {
      border-color: var(--color-primary, #0088c6);
      background-color: color-mix(in srgb, var(--color-primary, #0088c6) 5%, transparent);
    }

    .sum-attach__dropzone--dragover {
      border-color: var(--color-primary, #0088c6);
      background-color: color-mix(in srgb, var(--color-primary, #0088c6) 10%, transparent);
    }

    .sum-attach__dropzone--disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .sum-attach__icon {
      font-size: 1.5rem;
      color: var(--text-secondary, #666);
    }

    .sum-attach__text {
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-secondary, #666);
      text-align: center;
    }

    .sum-attach__file-list {
      list-style: none;
      padding: 0;
      margin: 4px 0 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sum-attach__file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--surface-card, #f5f5f5);
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .sum-attach__file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-primary, #333);
    }

    .sum-attach__file-size {
      color: var(--text-secondary, #666);
      font-size: var(--font-size-xs, 0.75rem);
    }

    .sum-attach__file-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary, #666);
      padding: 2px;
      display: flex;
    }

    .sum-attach__file-remove:hover {
      color: var(--color-error, #d32f2f);
    }

    .sum-attach__errors {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-attach__error {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-error, #d32f2f);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumAttachComponent implements FormValueControl<File[]> {
  readonly value = model<File[]>([]);
  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalField[]>([]);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly accept = input<string>('.doc,.docx,.pdf,.xls,.xlsx');
  readonly multiple = input<boolean>(true);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly isDragOver = signal(false);

  readonly files = computed(() => this.value());

  openFileDialog() {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  removeFile(index: number, event: Event) {
    event.stopPropagation();
    const current = [...this.value()];
    current.splice(index, 1);
    this.value.set(current);
    this.touched.set(true);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  private addFiles(newFiles: File[]) {
    if (this.multiple()) {
      this.value.set([...this.value(), ...newFiles]);
    } else {
      this.value.set([newFiles[0]]);
    }
    this.touched.set(true);
  }
}
