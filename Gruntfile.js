module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: {
        files: [
          {
            dot: true,
            src: [
              'lib/client/client.wilson.js',
              'lib/client/client.wilson.min.js'
            ]
          }
        ]
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          'lib/client/src/wilson.js',
          'lib/client/src/**/*.js'
        ],
        dest: 'lib/client/client.wilson.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        compress: {
          'pure_funcs': [
            'console.log',
            'console.dir',
            'console.warn',
            'console.error',
            'console.info'
          ]
        }
      },
      build: {
        src: 'lib/client/client.wilson.js',
        dest: 'lib/client/client.wilson.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('wilson-build', ['concat', 'uglify']);

  // Default task(s).
  grunt.registerTask('default', ['wilson-build']);

};