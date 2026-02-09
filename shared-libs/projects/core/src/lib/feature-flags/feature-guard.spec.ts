// projects/core/src/lib/feature-flags/feature-guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, Route, UrlSegment } from '@angular/router';

import { featureCanMatch } from './feature-guard';
import { FeatureFlagsService } from './feature-flags.service';

describe('featureCanMatch', () => {
  const mockFF: jest.Mocked<Pick<FeatureFlagsService, 'isOn'>> = {
    isOn: jest.fn<boolean, [string]>()
  };
  const mockRouter: jest.Mocked<Pick<Router, 'parseUrl'>> = {
    parseUrl: jest.fn<UrlTree, [string]>()
  };

  function setup() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagsService, useValue: mockFF },
        { provide: Router, useValue: mockRouter }
      ]
    });
    jest.clearAllMocks();
  }

  // helpers mínimos para llamar al guard con firma (route, segments)
  const dummyRoute: Route = { path: 'x' };
  const dummySegments: UrlSegment[] = [new UrlSegment('x', {})];

  it('devuelve true cuando el flag está activo', () => {
    setup();
    mockFF.isOn.mockReturnValue(true);

    const guard = featureCanMatch('beta');
    const result = TestBed.runInInjectionContext(() => guard(dummyRoute, dummySegments));

    expect(mockFF.isOn).toHaveBeenCalledWith('beta');
    expect(result).toBe(true);
    expect(mockRouter.parseUrl).not.toHaveBeenCalled();
  });

  it('redirige a "/" cuando el flag está inactivo (por defecto)', () => {
    setup();
    mockFF.isOn.mockReturnValue(false);

    const tree = {} as UrlTree;
    mockRouter.parseUrl.mockReturnValue(tree);

    const guard = featureCanMatch('paywall');
    const result = TestBed.runInInjectionContext(() => guard(dummyRoute, dummySegments));

    expect(mockFF.isOn).toHaveBeenCalledWith('paywall');
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/');
    expect(result).toBe(tree);
  });

  it('redirige a la ruta custom cuando se especifica redirectTo', () => {
    setup();
    mockFF.isOn.mockReturnValue(false);

    const tree = { custom: true } as unknown as UrlTree;
    mockRouter.parseUrl.mockReturnValue(tree);

    const guard = featureCanMatch('newDashboard', '/login');
    const result = TestBed.runInInjectionContext(() => guard(dummyRoute, dummySegments));

    expect(mockFF.isOn).toHaveBeenCalledWith('newDashboard');
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    expect(result).toBe(tree);
  });
});
