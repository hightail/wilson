/**
 * Gulpfile to build and test Wilson
 */
var gulp    = require('gulp'),
    concat  = require('gulp-concat'),
    rename  = require('gulp-rename'),
    uglify  = require('gulp-uglify'),
    pkg     = require('./package.json');


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

gulp.task('default', ['build']);





