import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  viewChild,
  signal,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const LEGACY_URL = 'http://localhost:4500';

interface LegacyMessage {
  type: 'LEGACY_READY' | 'NAVIGATE' | 'OPEN_MF';
  path?: string;
  data?: unknown;
}

@Component({
  selector: 'app-legacy-wrapper',
  standalone: true,
  template: `
    <div class="legacy-wrapper">
      @if (!ready()) {
        <div class="legacy-wrapper__loading">Cargando sistema legacy...</div>
      }
      <iframe
        #legacyFrame
        [src]="safeUrl"
        class="legacy-wrapper__frame"
        [class.legacy-wrapper__frame--visible]="ready()"
        title="Sistema Legacy"></iframe>
    </div>
  `,
  styles: `
    .legacy-wrapper {
      width: 100%;
      height: calc(100vh - 58px);
      position: relative;
    }

    .legacy-wrapper__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1rem;
      color: var(--text-secondary, #666);
    }

    .legacy-wrapper__frame {
      width: 100%;
      height: 100%;
      border: none;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .legacy-wrapper__frame--visible {
      opacity: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegacyWrapperComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly messageHandler = this.onMessage.bind(this);

  readonly legacyFrame = viewChild<ElementRef<HTMLIFrameElement>>('legacyFrame');
  readonly ready = signal(false);
  readonly safeUrl: SafeResourceUrl;

  constructor() {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(LEGACY_URL);
  }

  ngOnInit() {
    window.addEventListener('message', this.messageHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageHandler);
  }

  sendToLegacy(data: unknown) {
    const frame = this.legacyFrame()?.nativeElement;
    frame?.contentWindow?.postMessage(data, LEGACY_URL);
  }

  private onMessage(event: MessageEvent<LegacyMessage>) {
    if (!event.origin.includes('localhost')) return;

    const { type, path, data } = event.data;

    switch (type) {
      case 'LEGACY_READY':
        this.ready.set(true);
        break;

      case 'NAVIGATE':
        if (path) this.router.navigateByUrl(path);
        break;

      case 'OPEN_MF':
        if (path) this.router.navigateByUrl(path, { state: data as Record<string, unknown> });
        break;
    }
  }
}
