/**
 * Gulpfile to build and test Wilson
 */
 var gulp      = require('gulp'),
 concat        = require('gulp-concat'),
 rename        = require('gulp-rename'),
 uglify        = require('gulp-uglify'),
 pkg           = require('./package.json'),
 karmaServer   = require('karma').Server;


gulp.task('build', function() {
return gulp.src(['lib/client/src/wilson.js', 'lib/client/src/**/*.js'])
 .pipe(concat('client.wilson.js'))
 .pipe(gulp.dest('lib/client'))
 .pipe(uglify({
   output: {
     'preamble': '/*** Wilson Client Framework  v' + pkg.version + ' -- ' + (new Date().toUTCString()) + ' ***/\n'
   }
 }))
 .pipe(rename('client.wilson.min.js'))
 .pipe(gulp.dest('lib/client'));
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


gulp.task('dist', ['test', 'build-plugins', 'build']);

gulp.task('default', ['build-plugins', 'build']);





