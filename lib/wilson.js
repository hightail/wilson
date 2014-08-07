var express = require('express');
var version = require('./routes/version'),
    config = require('./routes/config'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    ConfigService = require('./services/config'),
    configMiddleware = require('./middleware/config');

module.exports = function(wilsonConfigJson) {
  var app = express();

  var wilsonConfig = ConfigService(wilsonConfigJson);
  var serverConfig = wilsonConfig.getConfig('server');

  //set shared server config
  app.set('wilson-config', serverConfig);

  //Create Wilson object on the request, this is used to store connection
  //information relevant to Wilson
  app.use(function(req, res, next) {
    req.wilson = {
      tags: {}
    };
    next();
  });

  //Setup tag middlewares
  var tagMiddlewares = [];
  var tagDir = path.join(serverConfig.projectPaths.root, serverConfig.projectPaths.tagMiddleware);
  var filepaths = fs.readdirSync(tagDir);

  if (filepaths) {
    _.each(filepaths, function(filepath) {
      var middlewarePath = path.join(tagDir, filepath.replace('.js', ''));
      var middleware = require(middlewarePath);
      app.use('/config', middleware);
    });
  } else {
    console.log('Failed to load tag middleware from "' + tagDir + '"');
  }

  // Setup config middleware
  app.use(configMiddleware);

  //Setup framework routes
  app.get('/version', version(app));
  app.get('/config', config(app));
  //app.get('/component', tagHashMiddleware, component(app));

  return app;
}

