import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Button } from 'primeng/button';

export type SumBtnSeverity =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'contrast';
export type SumBtnSize = 'small' | 'large' | undefined;

@Component({
  selector: 'sum-btn',
  standalone: true,
  imports: [Button],
  template: `
    <p-button
      [label]="label()"
      [severity]="severity()"
      [icon]="icon()"
      [iconPos]="iconPos()"
      [disabled]="disabled()"
      [loading]="loading()"
      [outlined]="outlined()"
      [rounded]="rounded()"
      [text]="textStyle()"
      [size]="size()"
      [type]="type()"
      (onClick)="clicked.emit($event)" />
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumBtnComponent {
  readonly label = input<string>('');
  readonly severity = input<SumBtnSeverity>('primary');
  readonly icon = input<string>('');
  readonly iconPos = input<'left' | 'right' | 'top' | 'bottom'>('left');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly outlined = input<boolean>(false);
  readonly rounded = input<boolean>(false);
  readonly textStyle = input<boolean>(false);
  readonly size = input<SumBtnSize>(undefined);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly clicked = output<MouseEvent>();
}
