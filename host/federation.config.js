const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'host',

  remotes: {
    home: 'http://localhost:4201/remoteEntry.json',
    templates: 'http://localhost:4202/remoteEntry.json',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    'chart.js/auto',
    'chart.js',
    '@primeuix/themes',
    '@primeuix/themes/aura',
  ],

  features: {
    ignoreUnusedDeps: true,
  },
});
