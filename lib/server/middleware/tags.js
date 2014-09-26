var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    wallStack = require('../utils/walk-stack');

module.exports = function(wilsonConfig) {
  //Setup tag middlewares
  var tagMiddlewares = [];
  var paths = wilsonConfig.server.projectPaths;
  console.log('paths', paths);
  var tagDir = path.join(paths.root, paths.tagMiddleware);
  var filepaths = fs.readdirSync(tagDir);

  if (filepaths) {
    _.each(filepaths, function(filepath) {
      var middlewarePath = path.join(tagDir, filepath.replace('.js', ''));
      var middleware = require(middlewarePath);
      //app.use('/config', middleware);
      tagMiddlewares.push(middleware);
    });
  } else {
    console.log('Failed to load tag middleware from "' + tagDir + '"');
  }

  /**
   * This function will run all wilson 'tag' middlewares
   *
   * @param req
   * @param res
   * @param next
   */
  function tagMiddleware(req, res, next) {
    if (!req.wilson) {
      req.wilson = {};
    }
    _.merge(req.wilson, {
      tags: {
        language: ''
      }
    });

    wallStack(tagMiddlewares, req, res, next);

    //this.locals.wilsonConfig = _.merge({}, req.wilson, wilson.config.client)
  }

  return tagMiddleware;
};

module.exports.$inject = ['wilson.config'];