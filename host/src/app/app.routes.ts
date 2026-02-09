import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';
import { LegacyWrapperComponent } from './components/legacy-wrapper/legacy-wrapper.component';
import { UsersComponent } from './pages/contacto/users.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => loadRemoteModule('home', './routes').then(m => m.routes)
  },
  {
    path: 'templates',
    loadChildren: () => loadRemoteModule('templates', './routes').then(m => m.routes)
  },
  {
    path: 'legacy',
    component: LegacyWrapperComponent
  },
  {
    path: 'users',
    component: UsersComponent
  }
];
