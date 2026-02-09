import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { SanitizerService } from './sanitizer.service';

describe('SanitizerService', () => {
  let service: SanitizerService;
  let domSanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DomSanitizer,
          useValue: {
            sanitize: jest.fn().mockReturnValue('sanitized-content')
          }
        }
      ]
    });
    service = TestBed.inject(SanitizerService);
    domSanitizer = TestBed.inject(DomSanitizer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should sanitize HTML content', () => {
    const result = service.sanitizeHtml('<p>Test</p>');
    expect(domSanitizer.sanitize).toHaveBeenCalledWith(1, '<p>Test</p>');
    expect(result).toBe('sanitized-content');
  });

  it('should return empty string when sanitizeHtml result is null', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue(null);
    const result = service.sanitizeHtml('<p>Test</p>');
    expect(result).toBe('');
  });

  it('should detect unsafe HTML', () => {
    expect(service.isSafeHtml('<script>alert(1)</script>')).toBeFalsy();
    expect(service.isSafeHtml('javascript:alert(1)')).toBeFalsy();
    expect(service.isSafeHtml('data:text/html,<script>alert(1)</script>')).toBeFalsy();
    expect(service.isSafeHtml('<p>Safe content</p>')).toBeTruthy();
  });

  it('should sanitize URLs', () => {
    const result = service.sanitizeUrl('https://example.com');
    expect(domSanitizer.sanitize).toHaveBeenCalledWith(4, 'https://example.com');
    expect(result).toBe('sanitized-content');
  });

  it('should return empty string when sanitizeUrl result is null', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue(null);
    const result = service.sanitizeUrl('https://example.com');
    expect(result).toBe('');
  });

  it('should sanitize styles', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue('sanitized-content');
    const result = service.sanitizeStyle('color: red');
    expect(domSanitizer.sanitize).toHaveBeenCalledWith(2, 'color: red');
    expect(result).toBe('sanitized-content');
  });

  it('should return empty string when sanitizeStyle result is null', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue(null);
    const result = service.sanitizeStyle('color: red');
    expect(result).toBe('');
  });

  it('should sanitize scripts', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue('sanitized-content');
    const result = service.sanitizeScript('console.log("test")');
    expect(domSanitizer.sanitize).toHaveBeenCalledWith(3, 'console.log("test")');
    expect(result).toBe('sanitized-content');
  });

  it('should return empty string when sanitizeScript result is null', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue(null);
    const result = service.sanitizeScript('console.log("test")');
    expect(result).toBe('');
  });

  it('should sanitize resource URLs', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue('sanitized-content');
    const result = service.sanitizeResourceUrl('https://example.com/resource');
    expect(domSanitizer.sanitize).toHaveBeenCalledWith(5, 'https://example.com/resource');
    expect(result).toBe('sanitized-content');
  });

  it('should return empty string when sanitizeResourceUrl result is null', () => {
    (domSanitizer.sanitize as jest.Mock).mockReturnValue(null);
    const result = service.sanitizeResourceUrl('https://example.com/resource');
    expect(result).toBe('');
  });

  it('should strip dangerous tags', () => {
    const html =
      '<div>Safe <script>alert("unsafe")</script><iframe src="evil.com"></iframe><button onclick="hack()">Click</button></div>';
    const result = service.stripDangerousTags(html);

    expect(result).not.toContain('<script>');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('onclick=');
  });
});
