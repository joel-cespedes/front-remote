export interface AppConfig {
  appName: string;
  http: {
    addTokenJwt: boolean;
    excludeTokenJwt: string[];
    retries: {
      retriesHttpRequest: boolean;
      maxRetries: number;
      maxInterval: number;
      exceptionsHttp: string[];
    };
  };
  globalLoading: boolean;
  cache: {
    cache: boolean;
    maxAge: number;
    cacheableUrls: string[];
  };
  trace: {
    audit: boolean;
    auditHost: string;
    intervalSend?: number;
  };
  logger: {
    loggers: boolean;
    loggersHost: string;
  };
  errors: {
    httpErrors: boolean;
    httpErrorsHost: string;
    jsErrors: boolean;
    jsErrorsHost: string;
  };
  apiModules: { name: string; baseUrl: string; path: string }[];
  features?: Record<string, unknown>;
}
