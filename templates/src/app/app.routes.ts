import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/template-list/template-list.page').then(
        (m) => m.TemplateListPage
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/create-template/create-template.page').then(
        (m) => m.CreateTemplatePage
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/create-template/create-template.page').then(
        (m) => m.CreateTemplatePage
      ),
  },
];
