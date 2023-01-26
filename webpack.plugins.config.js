const path = require('path');

module.exports = {
    entry: [
        './node_modules/jquery/dist/jquery.js',
        './node_modules/lodash/lodash.js',
        './node_modules/angular/angular.js',
        './node_modules/angular-route/angular-route.js',
        './node_modules/angular-local-storage/dist/angular-local-storage.js',
        './node_modules/javascript-state-machine/state-machine.js',
        './node_modules/signals/dist/signals.js',
        './node_modules/i18next/i18next.min.js'
    ],
    mode: 'production',
    output: {
        filename: 'client.wilson.plugins.js',
        path: path.resolve(__dirname, 'lib/client'),
    },
    optimization: {
        minimize: false
    }
};