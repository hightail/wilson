/**
 * Middleware to run all application specific 'tag' middlewares
 * @param wilsonConfig
 * @returns {tagMiddleware}
 */

var path    = require('path'),
  fs        = require('fs'),
  _         = require('../utils/HtLodash'),
  walkStack = require('../utils/walk-stack');

module.exports = function(wilsonConfig) {
  //Setup tag middlewares
  var tagMiddlewares = [];
  var paths = wilsonConfig.server.projectPaths;
  //console.log('paths', paths);
  var tagDir = path.join(paths.root, paths.tagMiddleware);
  var filepaths = fs.readdirSync(tagDir);

  if (filepaths) {
    _.each(filepaths, function(filepath) {
      var middlewarePath = '';
      if (_.includes(filepath, '.js')) {
        middlewarePath = path.join(tagDir, filepath.replace('.js', ''));
      } else if (_.includes(filepath, '.ts')) {
        middlewarePath = path.join(tagDir, filepath.replace('.ts', ''));
      }
      if (_.includes(middlewarePath, 'CodeUtility')) {
        console.log('middlewarePath', middlewarePath);
      }
      var middleware = require(middlewarePath);
      tagMiddlewares.push(middleware);
    });
  } else {
    console.log('Failed to load tag middleware from "' + tagDir + '"');
  }

  /**
   * This function will run all application specific 'tag' middlewares
   *
   * @param req
   * @param res
   * @param next
   */
  function tagMiddleware(req, res, next) {
    //Run application specific tag middlewares
    walkStack(tagMiddlewares, req, res, next);
  }

  return tagMiddleware;
};