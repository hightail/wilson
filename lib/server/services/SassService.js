var sass  = require('node-sass'),
    fs    = require('fs'),
    Q     = require('q'),
    glob  = require('glob'),
    _     = require('lodash');

module.exports = function(wilsonConfig) {

  var SASS_GLOB_PATH =  wilsonConfig.server.projectPaths.root +
                        wilsonConfig.server.projectPaths.sass +
                        '/**/*.scss';

  var cache = {
    css: false,
    sass: false
  };

  /**
   * Loads SASS for all Wilson components and returns a concatenated SASS string
   *
   * @returns {promise}
   */
  function getWilsonScss() {
    var deferred = Q.defer();

    if (cache.sass && wilsonConfig.server.deploy.mode !== 'development') {
      deferred.resolve(cache.sass);
    } else {
      var wilsonSass = '';

      //Get list of all SASS files
      glob(SASS_GLOB_PATH, function (err, filePaths) {
        if (err) {
          deferred.reject(err);
        } else {
          //Load each SASS file and concat them
          _.each(filePaths, function(filePath) {
            var fileScss = fs.readFileSync(filePath, 'utf8');

            wilsonSass += fileScss + '\n';
          });

          //Store SASS in cache
          cache.sass = wilsonSass;

          deferred.resolve(wilsonSass);
        }
      })
    }


    return deferred.promise;
  }

  /**
   * Returns CSS for Wilson components
   *
   * @param options   node-sass render() options
   *
   * @returns {promise}
   */
  function getComponentCss(options) {
    options = options || {};

    var deferred = Q.defer();

    getWilsonScss().then(
      function(wilsonComponentSass) {

        var renderOptions = _.merge({
          data: wilsonComponentSass,
          success: function(css) {
            deferred.resolve(css);
          },
          error: function(error) {
            deferred.reject(error);
          }
        }, options);

        sass.render(renderOptions);
      },
      function(error) {
        deferred.reject(error);
      }
    );

    return deferred.promise;
  }


  //SassService
  return {
    getComponentCss: getComponentCss
  };
}
