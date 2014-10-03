var express = require('express');

//DI
var dependable = require('dependable'),
  container = dependable.container();

var path = require('path'),
    configMiddleware = require('./middleware/config'),
    noCacheMiddleware = require('./middleware/no-cache'),
    wallStack = require('./utils/walk-stack');

module.exports = function(app, wilsonConfigJson) {
  //Register our dependencies
  container.register('wilsonConfig', wilsonConfigJson);

  var wilsonConfig = container.get('wilsonConfig');

  // TODO:Justin
  // Once I change this to be a express sub app, set wilsonConfig.client.app.mountpath = app.mountpath;

  //Services
  container.register('logger', require('./services/Logger'));
  container.register('CacheService', require('./services/CacheService'));
  container.register('BundleService', require('./services/BundleService'));
  container.register('ComponentService', require('./services/ComponentService'));

  //modules
  container.register('I18NModule', require('./modules/I18NModule'));

  //Utilities
  container.register('ConnectionFilterUtil', require('./utils/ConnectionFilterUtil'));

  //Middleware
  container.register('middleware/tags', require('./middleware/tags'));
  container.register('middleware/filters', require('./middleware/filters'));
  container.register('middleware/parse-tag-hash', require('./middleware/parse-tag-hash'));

  //Routes
  container.register('routes/version', require('./routes/version'));
  container.register('routes/config', require('./routes/config'));
  container.register('routes/bundle', require('./routes/bundle'));
  container.register('routes/component', require('./routes/component'));

  //Get middleware references
  var tagMiddleware = container.get('middleware/tags');
  var parseTagHashMiddleware = container.get('middleware/parse-tag-hash');
  var filtersMiddleware = container.get('middleware/filters');

  //I18N
  var I18NModule = container.get('I18NModule');
  I18NModule.init(app);

  //ROUTING
  var router = express.Router();

  router.use(configMiddleware);
  router.use(I18NModule.handle);

  //Setup framework routes
  router.get('/version', container.get('routes/version'));
  router.get('/config/:tagHash?', parseTagHashMiddleware, I18NModule.i18nConfigMiddleware, container.get('routes/config'));

  //Wilson Client Routes
  router.get('/client.wilson.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.js'));
  });
  router.get('/client.wilson.min.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.min.js'));
  });

  //Bundles
  router.get('/:version?/bundle/:name?', container.get('routes/bundle'));

  //Components
  router.get('/:version?/component/:name/:tagHash?', parseTagHashMiddleware, I18NModule.i18nConfigMiddleware, container.get('routes/component'));

  /**
   * Wilson
   */
  return {
    config: wilsonConfig,
    router: router,
    middleware: function(res, req, next) {
      wallStack([
        I18NModule.handle,
        configMiddleware,
        tagMiddleware,
        I18NModule.getLanguageFromUrlMiddleware,
        filtersMiddleware,
        noCacheMiddleware
      ], res, req, next);
    }
  };
}

