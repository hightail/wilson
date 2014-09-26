var express = require('express'),
    i18next = require('i18next');

//DI
//var intravenous = require('intravenous');
//var container = intravenous.create();

var dependable = require('dependable'),
  container = dependable.container();

var path = require('path'),
    configMiddleware = require('./middleware/config'),
    wallStack = require('./utils/walk-stack');

module.exports = function(app, wilsonConfigJson) {
  var tagMiddleware;
  var useDependable = true;

  if (useDependable) {
  //Register our dependencies
    container.register('wilsonConfig', wilsonConfigJson);

    var wilsonConfig = container.get('wilsonConfig');

    // TODO:Justin
    // Once I change this to be a express sub app, set wilsonConfig.client.app.mountpath = app.mountpath;

//  var logger = require('./services/Logger')(wilsonConfig);
//  container.register('Logger', logger, "singleton");

    //Services
    container.register('logger', require('./services/Logger'));
    container.register('CacheService', require('./services/CacheService'));
    container.register('BundleService', require('./services/BundleService'));
    container.register('ComponentService', require('./services/ComponentService'));

    //Utilities
    container.register('ConnectionFilterUtil', require('./utils/ConnectionFilterUtil'));

    //Middleware
    container.register('middleware/tags', require('./middleware/tags'));
    //Routes
    container.register('routes/version', require('./routes/version'));
    container.register('routes/config', require('./routes/config'));
    container.register('routes/bundle', require('./routes/bundle'));
    container.register('routes/component', require('./routes/component'));

    tagMiddleware = container.get('middleware/tags');

  } else {
    //Register our dependencies
    container.register('wilson.config', wilsonConfigJson, "singleton");

    var wilsonConfig = container.get('wilson.config');
//  var logger = require('./services/Logger')(wilsonConfig);
//  container.register('Logger', logger, "singleton");

    //Services
    container.register('Logger', require('./services/Logger'), "singleton");
    container.register('CacheService', require('./services/CacheService'), "singleton");
    container.register('BundleService', require('./services/BundleService'), "singleton");
    container.register('ComponentService', require('./services/ComponentService'), "singleton");

    //Middleware
    container.register('middleware/tags', require('./middleware/tags'), "singleton");
    //Routes
    container.register('routes/version', require('./routes/version'), "singleton");
    container.register('routes/config', require('./routes/config'), "singleton");
    container.register('routes/bundle', require('./routes/bundle'), "singleton");
    container.register('routes/component', require('./routes/component'), "singleton");

    tagMiddleware = container.get('middleware/tags');

//    var logger = container.get('Logger');
//    console.log('logger(1)', logger);
//
//    var logger2 = container.get('Logger');
//    console.log('logger(1)', logger2);
  }



  //logger.info('Da fuck?');
  //logger.warn('Da fuck?');


  //I18N
  // i18next configuration
  var supportLngs = ['en'];//_.pluck(config.i18n.supportedLngs, 'locale');
  var i18nextOptions = {
    // do not set namespace here; we'll add them dynamically for each component later
    ns: 'app', // give i18next something so it won't complain
    fallbackToDefaultNS: false,
    nsseparator: ':::',
    keyseparator: '::',
    useCookie: false,
    fallbackLng: wilsonConfig.client.i18n.fallbackLng,
    // can't preload anymore because we don't know what brand to load languages for until run time
    // but good to keep this here so we know preload exists
    //preload: supportLngs, // must preload, or in prodution mode it won't work reliably
    supportedLngs: supportLngs,
    saveMissing: true, // on client side, use sendMissing
    sendMissingTo: 'all',
    resSetPath: __dirname + '/../client/locales/__lng__/__ns__.json',
    resGetPath: __dirname + '/../client/locales/__lng__/__ns__.json',
    debug: false
  };

  i18next.init(i18nextOptions);
  i18next.loadNamespaces(['app'], function() {
    console.log('loaded i18next namespaces: ', i18next.options.ns.namespaces);
  });
  i18next.serveClientScript(app)
    .serveDynamicResources(app)
    .serveMissingKeyRoute(app);


  var router = express.Router();

  router.use(i18next.handle);

  // Setup config middleware
  //router.use(configMiddleware);

  //Setup framework routes
  router.get('/version', container.get('routes/version'));
  router.get('/config', tagMiddleware, container.get('routes/config'));


  //Wilson Client Routes
  router.get('/client.wilson.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.js'));
  });
  router.get('/client.wilson.min.js', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/client.wilson.min.js'));
  });

  router.get('/:version?/bundle/:name?', tagMiddleware, container.get('routes/bundle'));
  router.get('/:version?/component/:name/:connectionFilters?', tagMiddleware, container.get('routes/component'));


  //Return Wilson
  return {
    config: wilsonConfig,
    router: router,
    middleware: function(res, req, next) {
      wallStack([tagMiddleware], res, req, next);
    }
  };
}

