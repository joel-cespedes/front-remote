import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { Subscription, filter, fromEvent } from 'rxjs';
import { AppConfigStore } from '../config/app-config.service';
import { TraceBufferService } from './trace-buffer.service';
import { TraceManagerService } from './trace-manager.service';

/**
 * Service for automatically tracking user interactions and navigation
 * Captures clicks, navigation events, and other user activities for tracing
 */
@Injectable({ providedIn: 'root' })
export class TraceAutoTrackerService implements OnDestroy {
  /* Application configuration store */
  private readonly cfg = inject(AppConfigStore);
  /* Trace buffer service */
  private readonly buf = inject(TraceBufferService);
  /* Trace manager service */
  private readonly tm = inject(TraceManagerService);

  /* Active subscriptions */
  private subs: Subscription[] = [];
  /* Router instance if available */
  private router?: Router;

  /**
   * Starts automatic tracking of user interactions
   * Sets up navigation and click event tracking
   */
  start(): void {
    const c = this.cfg.config();
    if (c.trace?.audit !== true) return;

    /* Start buffer flusher */
    this.buf.start();

    /* Router tracking */
    try {
      this.router = inject(Router);
      const s1 = this.router.events
        .pipe(filter((e: RouterEvent) => e instanceof NavigationEnd))
        .subscribe((e: NavigationEnd) => {
          this.buf.push({
            appName: c.appName,
            traceId: this.tm.getTraceId(),
            stage: 'navigation',
            timestamp: new Date().toISOString(),
            url: e.urlAfterRedirects || e.url,
            extra: { title: document.title }
          });
        });
      this.subs.push(s1);
    } catch {
      /* App without router -> ignore */
    }

    /* Global click tracking (lightweight) */
    const s2 = fromEvent<MouseEvent>(document, 'click').subscribe(ev => {
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName ?? 'UNKNOWN';
      const text = (target?.textContent ?? '').trim().slice(0, 80);
      this.buf.push({
        appName: c.appName,
        traceId: this.tm.getTraceId(),
        stage: 'click',
        timestamp: new Date().toISOString(),
        url: location.pathname + location.search,
        extra: { tag, text }
      });
    });
    this.subs.push(s2);
  }

  /**
   * Stops automatic tracking
   * Unsubscribes from all events and stops buffer
   */
  stop(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.buf.stop();
  }

  /**
   * Angular lifecycle hook - cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.stop();
  }
}
