import { inject, Injectable } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl,
  SafeScript,
  SafeStyle,
  SafeUrl
} from '@angular/platform-browser';

/**
 * Service for sanitizing potentially unsafe content to prevent XSS attacks.
 *
 * This service wraps Angular's DomSanitizer to provide simplified methods
 * for sanitizing different types of content (HTML, URLs, styles, etc.)
 * and adds additional safety checks.
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizerService {
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  /**
   * Sanitizes HTML content to prevent XSS attacks.
   *
   * @param html The HTML string to sanitize
   * @returns A SafeHtml object that can be used in Angular templates
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(1, html) || '';
  }

  /**
   * Checks if HTML content appears to be safe.
   *
   * Performs a basic check for common attack patterns like script tags
   * and malicious protocols.
   *
   * @param html The HTML string to check
   * @returns True if the HTML appears safe, false otherwise
   */
  isSafeHtml(html: string): boolean {
    return !/<script|javascript:|data:/i.test(html);
  }

  /**
   * Sanitizes URLs to prevent malicious redirects or script execution.
   *
   * @param url The URL string to sanitize
   * @returns A SafeUrl object that can be used in Angular templates
   */
  sanitizeUrl(url: string): SafeUrl {
    return this.sanitizer.sanitize(4, url) || '';
  }

  /**
   * Sanitizes CSS style content.
   *
   * @param style The CSS style string to sanitize
   * @returns A SafeStyle object that can be used in Angular templates
   */
  sanitizeStyle(style: string): SafeStyle {
    return this.sanitizer.sanitize(2, style) || '';
  }

  /**
   * Sanitizes JavaScript content.
   *
   * @param script The JavaScript code to sanitize
   * @returns A SafeScript object that can be used in Angular templates
   */
  sanitizeScript(script: string): SafeScript {
    return this.sanitizer.sanitize(3, script) || '';
  }

  /**
   * Sanitizes resource URLs (for iframes, objects, etc.)
   *
   * @param url The resource URL to sanitize
   * @returns A SafeResourceUrl object that can be used in Angular templates
   */
  sanitizeResourceUrl(url: string): SafeResourceUrl {
    return this.sanitizer.sanitize(5, url) || '';
  }

  /**
   * Removes potentially dangerous HTML tags and attributes.
   *
   * Strips script tags, iframe tags, and inline event handlers
   * to prevent XSS attacks.
   *
   * @param html The HTML string to process
   * @returns The sanitized HTML with dangerous elements removed
   */
  stripDangerousTags(html: string): string {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '');
  }
}
