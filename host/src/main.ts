import { initFederation } from '@angular-architects/native-federation';

initFederation({
  home: 'http://localhost:4201/remoteEntry.json',
  templates: 'http://localhost:4202/remoteEntry.json'
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
