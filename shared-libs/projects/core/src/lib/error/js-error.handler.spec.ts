import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { JsErrorHandler } from './js-error.handler'; // ⬅️ ajusta el import a tu ruta real
import { AppConfigStore } from '../config/app-config.service';
import { ErrorReporterService } from './error-reporter.service';

describe('JsErrorHandler', () => {
  const mockStore = { config: jest.fn() };
  const mockReporter: jest.Mocked<Pick<ErrorReporterService, 'reportJs'>> = {
    reportJs: jest.fn<void, [unknown]>()
  };

  function setupWithConfig(cfg: any) {
    TestBed.resetTestingModule();
    mockStore.config.mockReturnValue(cfg);

    TestBed.configureTestingModule({
      providers: [
        JsErrorHandler,
        { provide: AppConfigStore, useValue: mockStore },
        { provide: ErrorReporterService, useValue: mockReporter }
      ]
    });

    jest.clearAllMocks();
    const handler = TestBed.inject(JsErrorHandler);
    return handler;
  }

  it('no reporta errores HTTP (los maneja el interceptor) aunque esté habilitado', () => {
    const handler = setupWithConfig({
      appName: 'MyApp',
      errors: { jsErrors: true },
      logger: { loggers: true }
    });

    const httpErr = new HttpErrorResponse({ status: 500, statusText: 'Server' });

    expect(() => handler.handleError(httpErr)).not.toThrow();
    expect(mockReporter.reportJs).not.toHaveBeenCalled();
  });

  it('no reporta cuando está deshabilitado (errors.jsErrors=false y logger.loggers=false)', () => {
    const handler = setupWithConfig({
      appName: 'MyApp',
      errors: { jsErrors: false },
      logger: { loggers: false }
    });

    expect(() => handler.handleError(new Error('boom'))).not.toThrow();
    expect(mockReporter.reportJs).not.toHaveBeenCalled();
  });

  it('reporta cuando jsErrors=true (aunque logger.loggers=false)', () => {
    const handler = setupWithConfig({
      appName: 'MyApp',
      errors: { jsErrors: true },
      logger: { loggers: false }
    });

    const err = 'plain string error';
    handler.handleError(err);

    expect(mockReporter.reportJs).toHaveBeenCalledTimes(1);
    expect(mockReporter.reportJs).toHaveBeenCalledWith(err);
  });

  it('reporta cuando logger.loggers=true (aunque jsErrors=false)', () => {
    const handler = setupWithConfig({
      appName: 'MyApp',
      errors: { jsErrors: false },
      logger: { loggers: true }
    });

    const errObj = { foo: 'bar' };
    handler.handleError(errObj);

    expect(mockReporter.reportJs).toHaveBeenCalledTimes(1);
    expect(mockReporter.reportJs).toHaveBeenCalledWith(errObj);
  });

  it('no lanza excepciones al manejar errores arbitrarios (defensive)', () => {
    const handler = setupWithConfig({
      appName: 'MyApp',
      errors: { jsErrors: true },
      logger: { loggers: true }
    });

    const circular: any = {};
    circular.self = circular;

    expect(() => handler.handleError(circular)).not.toThrow();
    expect(mockReporter.reportJs).toHaveBeenCalledWith(circular);
  });
});
