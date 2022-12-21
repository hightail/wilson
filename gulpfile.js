/**
 * Gulpfile to build and test Wilson
 */
var gulp          = require('gulp'),
    concat        = require('gulp-concat'),
    rename        = require('gulp-rename'),
    uglify        = require('gulp-uglify'),
    pkg           = require('./package.json'),
    karmaServer   = require('karma').Server,
    browserify    = require("browserify"),
    tsify         = require("tsify"),
    sourcemaps    = require("gulp-sourcemaps"),
    buffer        = require("vinyl-buffer");


gulp.task('build', function() {
  return browserify({
    basedir: ".",
    debug: true,
    entries: ['lib/client/src/wilson.js', 'lib/client/src/**/*.js'],
    cache: {},
    packageCache: {},
  })
  .plugin(tsify)
  .transform('babelify', {
    presets: ['es2015'],
    extentions: ['.js', '.ts']
  })
  .pipe(concat('client.wilson.js'))
  .pipe(uglify({
    output: {
      'preamble': '/*** Wilson Client Framework  v' + pkg.version + ' -- ' + (new Date().toUTCString()) + ' ***/\n'
    }
  }))
  .bundle()
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(sourcemaps.write('./'))
  .pipe(rename('client.wilson.min.js'))
  .pipe(gulp.dest('lib/client'))
});

gulp.task('build-plugins', function() {
  return gulp.src([
    'node_modules/jquery/dist/jquery.js',
    'node_modules/lodash/lodash.js',
    'node_modules/angular/angular.js',
    'node_modules/angular-route/angular-route.js',
    'node_modules/angular-local-storage/dist/angular-local-storage.js',
    'node_modules/javascript-state-machine/state-machine.js',
    'node_modules/signals/dist/signals.js',
    'node_modules/i18next/i18next.min.js'
  ])
    .pipe(concat('client.wilson.plugins.js'))
    .pipe(gulp.dest('lib/client'))
    .pipe(uglify({
      output: {
        'preamble': '/*** Wilson Client Framework  v' + pkg.version + ' Plugin Dependencies -- ' + (new Date().toUTCString()) + ' ***/\n'
      }
    }))
    .pipe(rename('client.wilson.plugins.min.js'))
    .pipe(gulp.dest('lib/client'));
});


gulp.task('test', function(done) {
  (new karmaServer({ configFile: __dirname + '/test.config.js' }, done)).start();
});


gulp.task('dist', gulp.series('test', 'build-plugins', 'build'));

gulp.task('default', gulp.series('build-plugins', 'build'));





