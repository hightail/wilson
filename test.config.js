// Karma configuration
// Generated on Fri Apr 01 2016 21:34:58 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      // Plugins and Libraries
      'bower_components/jquery/dist/jquery.js',
      'bower_components/lodash/dist/lodash.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-local-storage/dist/angular-local-storage.js',
      'bower_components/javascript-state-machine/state-machine.js',
      'bower_components/i18next/i18next.min.js',

      // Test Plugins
      'bower_components/angular-mocks/angular-mocks.js',

      // Wilson Test Config
      'test/client/wilson-config.js',

      // Include Wilson
      'lib/client/src/wilson.js',

      // All Wilson Source Files
      'lib/client/src/services/*.js',
      'lib/client/src/utils/*.js',

      // Test Wilson App
      'test/client/app.js',

      // Test Utilities Files
      'test/client/test-runner.js',

      // Test Suite Files
      'test/client/src/wilsonTest.js',
      'test/client/src/services/**/*.js',
      'test/client/src/utils/**/*.js',
    ],


    // list of files to exclude
    exclude: [],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {},


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: 1
  })
};
