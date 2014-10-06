var express = require('express');

//DI
var dependable = require('dependable'),
  container = dependable.container();

var path = require('path'),
    hbs = require('hbs'),
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
  container.register('middleware/config', require('./middleware/config'));
  container.register('middleware/tags', require('./middleware/tags'));
  container.register('middleware/filters', require('./middleware/filters'));
  container.register('middleware/parse-tag-hash', require('./middleware/parse-tag-hash'));
  container.register('middleware/wilson-locals', require('./middleware/wilson-locals'));

  //Routes
  container.register('routes/version', require('./routes/version'));
  container.register('routes/config', require('./routes/config'));
  container.register('routes/bundle', require('./routes/bundle'));
  container.register('routes/component', require('./routes/component'));

  //Get middleware references
  var configMiddleware = container.get('middleware/config');
  var getTagsFromRequestMiddleware = container.get('middleware/tags');
  var getTagFromHashMiddleware = container.get('middleware/parse-tag-hash');
  var addFiltersToRequestMiddleware = container.get('middleware/filters');
  var wilsonLocalsMiddleware = container.get('middleware/wilson-locals');

  //
  // Handlebars JSON helper
  hbs.registerHelper('json', function(obj) {
    return JSON.stringify(obj);
  });

  //I18N
  var I18NModule = container.get('I18NModule');
  I18NModule.init(app);

  //ROUTING
  var router = express.Router();

  router.use(configMiddleware);
  router.use(I18NModule.handle);

  // VERSION
  router.get('/version', container.get('routes/version'));

  // CONFIG
  router.get('/config/:tagHash?', [
      getTagFromHashMiddleware,
      I18NModule.i18nConfigMiddleware,
      addFiltersToRequestMiddleware,
      wilsonLocalsMiddleware
    ], container.get('routes/config'));

  //WILSON CLIENT
  router.get('/client.wilson.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.js'));
  });
  router.get('/client.wilson.min.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.min.js'));
  });

  // BUNDLES
  router.get('/:version?/bundle/:name?', container.get('routes/bundle'));

  // COMPONENTS
  router.get('/:version?/component/:name/:tagHash?', [
      getTagFromHashMiddleware,
      I18NModule.i18nConfigMiddleware
    ], container.get('routes/component'));

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
        getTagsFromRequestMiddleware,
        I18NModule.getLanguageFromUrlMiddleware,
        I18NModule.i18nConfigMiddleware,
        addFiltersToRequestMiddleware,
        wilsonLocalsMiddleware,
        noCacheMiddleware
      ], res, req, next);
    }
  };
}

