var express = require('express');

//DI
var dependable = require('dependable'),
  container = dependable.container();

var path = require('path'),
    hbs = require('hbs'),
    fs = require('fs'),
    _ = require('lodash'),
    hidash = require('./utils/hidash'),
    noCacheMiddleware = require('./middleware/no-cache'),
    walkStack = require('./utils/walk-stack');

//Load in the default Wilson config
var DEFAULT_WILSON_CONFIG = require(path.join(__dirname, './wilson-config.json'));

/**
 * Given a App specific Wilson config, returns a fully prepared Wilson Config
 * @param appConfig
 * @returns {*}
 */
function prepareConfig(appConfig) {
  //Merge the passed in config options ON TOP of the defaults
  var config = hidash.mergeAll({}, DEFAULT_WILSON_CONFIG, appConfig);

  //Resolve the root path so that it can be used easily from other modules
  config.server.projectPaths.root = path.resolve(config.server.projectPaths.root);

  return config;
}

/**
 * Creates a new Wilson
 *
 * @param app                   An express app
 * @param appWilsonConfigJson   App specific Wilson settings
 *
 * @returns {{config: *, router: *, middleware: middleware}}
 */
module.exports = function(app, appWilsonConfigJson, dependencies) {
  //configure app

  //Register our dependencies

  // WILSON CONFIG
  container.register('wilsonFrameworkConfig', DEFAULT_WILSON_CONFIG);
  container.register('wilsonConfig', prepareConfig(appWilsonConfigJson));
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
  container.register('hidash', hidash);
  container.register('ConnectionFilterUtil', require('./utils/ConnectionFilterUtil'));
  container.register('RevisionedFileUtil', require('./utils/RevisionedFileUtil'));

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

  //Apply App level dependency overrides
  _.each(dependencies, function(dependency, dependencyName) {
    container.register(dependencyName, dependency);
  });

  //Get middleware references
  var configMiddleware = container.get('middleware/config');
  var getTagsFromRequestMiddleware = container.get('middleware/tags');
  var getTagFromHashMiddleware = container.get('middleware/parse-tag-hash');
  var addFiltersToRequestMiddleware = container.get('middleware/filters');
  var wilsonLocalsMiddleware = container.get('middleware/wilson-locals');

  //I18N
  var I18NModule = container.get('I18NModule');
  I18NModule.init(app);

  //PRERENDER
  if (process.env.PRERENDER_SERVICE_URL && !_.isEmpty(process.env.PRERENDER_SERVICE_URL)) {
    app.use(require('prerender-node'));//.set('prerenderToken', 'WILSON_PRERENDER_TOKEN'));
  }

  //ROUTING
  var router = express.Router();

  router.use(configMiddleware);
  router.use(I18NModule.handle);

  // VERSION
  router.get('/version', container.get('routes/version'));

  // CONFIG
  router.get('/:version?/config/:tagHash?', [
      getTagFromHashMiddleware,
      I18NModule.i18nConfigMiddleware,
      addFiltersToRequestMiddleware,
      wilsonLocalsMiddleware
    ], container.get('routes/config'));

  //WILSON CLIENT
  router.get('/:version?/client.wilson.js', function(req, res) {
    //Set max age headers based on config for wilson (NOTE: maxAgeMs is millis, so we divide to specify seconds)
    var maxAgeMs = wilsonConfig.server.caching.maxAge.wilson;
    res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
    res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());

    res.sendFile(path.join(__dirname, '../client/client.wilson.js'));
  });
  router.get('/:version?/client.wilson.min.js', function(req, res) {
    //Set max age headers based on config for wilson (NOTE: maxAgeMs is millis, so we divide to specify seconds)
    var maxAgeMs = wilsonConfig.server.caching.maxAge.wilson;
    res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
    res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());

    res.sendFile(path.join(__dirname, '../client/client.wilson.min.js'));
  });

  // BUNDLES
  router.get('/:version?/bundle/:name?', container.get('routes/bundle'));

  // COMPONENTS
  router.get('/:version?/component/:name/:tagHash?', [
      getTagFromHashMiddleware,
      I18NModule.i18nConfigMiddleware
    ], container.get('routes/component'));


  //HANDLEBARS
  function registerHandlebarsHelpers(hbs) {
    hbs.localsAsTemplateData(app);

    // Handlebars JSON helper
    hbs.registerHelper('json', function(obj) {
      return JSON.stringify(obj);
    });

    //Load index page
    var wilsonScriptsHbsPath = path.join(__dirname, './templates/wilson-scripts.hbs');
    var wilsonScriptsHbs = fs.readFileSync(wilsonScriptsHbsPath, 'utf8');
    var wilsonScriptsTemplate = hbs.compile(wilsonScriptsHbs);

    hbs.registerHelper('wilson-scripts', function(obj) {
      return wilsonScriptsTemplate({
        wilsonConfig: wilsonConfig
      });
    });

    //I18NModule.registerHandlebarsHelpers(hbs);
  }

  registerHandlebarsHelpers(hbs);

  /**
   * Wilson
   */
  return {
    config: wilsonConfig,
    router: router,
    middleware: function(res, req, next) {
      walkStack([
        I18NModule.handle,
        configMiddleware,
        getTagsFromRequestMiddleware,
        I18NModule.getLanguageFromUrlMiddleware,
        I18NModule.i18nConfigMiddleware,
        addFiltersToRequestMiddleware,
        wilsonLocalsMiddleware,
        noCacheMiddleware
      ], res, req, next);
    },
    registerHandlebarsHelpers: registerHandlebarsHelpers
  };
};

