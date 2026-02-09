import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { MvThemeOverrides } from 'ux';
import { routes } from './app.routes';

const MvPreset = definePreset(Aura, MvThemeOverrides);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: MvPreset,
        options: {
          darkModeSelector: 'none'
        }
      }
    })
  ]
};
