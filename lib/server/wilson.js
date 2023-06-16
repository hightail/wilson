var express               = require('express');

//DI
var dependable            = require('dependable'),
  container               = dependable.container();

var path                  = require('path'),
    hbs                   = require('hbs'),
    fs                    = require('fs'),
    _                     = require('./utils/HtLodash'),
    noCacheMiddleware     = require('./middleware/no-cache'),
    walkStack             = require('./utils/walk-stack');

//Load in the default Wilson config
var DEFAULT_WILSON_CONFIG = require(path.join(__dirname, './wilson-config.json'));

/**
 * Given a App specific Wilson config, returns a fully prepared Wilson Config
 * @param appConfig
 * @returns {*}
 */
function prepareConfig(appConfig) {
  //Merge the passed in config options ON TOP of the defaults
  var config = _.mergeAll({}, DEFAULT_WILSON_CONFIG, appConfig);

  //Resolve the root path so that it can be used easily from other modules
  config.server.projectPaths.root = path.resolve(config.server.projectPaths.root);

  // Decorate versionedAssetPath as computed config property
  config.client.app.versionedAssetPath = config.client.app.assetPath + '/' + config.client.app.version;

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

  // Local Config / Script Vars
  var wilsonConfig              = container.get('wilsonConfig');
  var _wilsonScriptsHbsPath     = path.join(__dirname, './templates/wilson-scripts.hbs');
  var _wilsonRouteServicePath   = path.join(wilsonConfig.server.projectPaths.root, wilsonConfig.server.projectPaths.routeService);
  var _wilsonScriptsTemplate    = hbs.compile(fs.readFileSync(_wilsonScriptsHbsPath, 'utf8'));
  var _useExplicitRouteService  = fs.existsSync(_wilsonRouteServicePath);

  // TODO:Justin
  // Once I change this to be a express sub app, set wilsonConfig.client.app.mountpath = app.mountpath;

  // Forward Component Selector into the client config
  wilsonConfig.client.app.selectors = wilsonConfig.server.dependencies.selectors

  //Services
  container.register('logger', require('./services/Logger'));
  container.register('CacheService', require('./services/CacheService'));
  container.register('BundleService', require('./services/BundleService'));
  container.register('ComponentService', require('./services/ComponentService'));

  //modules
  container.register('I18NModule', require('./modules/I18NModule'));

  //Utilities
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
  container.register('routes/templates', require('./routes/templates'));
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

  //COMPONENT INIT
  var ComponentService = container.get('ComponentService');
  ComponentService.init({
    version: wilsonConfig.client.app.version,
    useCache: wilsonConfig.server.caching.useServerCache,
    readChangeList: wilsonConfig.server.caching.readChangeList
  });

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
    var useCache = wilsonConfig.server.caching.useServerCache;

    if (useCache) {
      res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
      res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);
    }

    res.sendFile(path.join(__dirname, '../client/client.wilson.js'));
  });
  router.get('/:version?/client.wilson.min.js', function(req, res) {
    //Set max age headers based on config for wilson (NOTE: maxAgeMs is millis, so we divide to specify seconds)
    var maxAgeMs = wilsonConfig.server.caching.maxAge.wilson;
    var useCache = wilsonConfig.server.caching.useServerCache;

    if (useCache) {
      res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
      res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);
    }

    res.sendFile(path.join(__dirname, '../client/client.wilson.min.js'));
  });

  //WILSON PLUGIN SCRIPTS
  router.get('/:version?/client.wilson.plugins.js', function(req, res) {
    //Set max age headers based on config for wilson (NOTE: maxAgeMs is millis, so we divide to specify seconds)
    var maxAgeMs = wilsonConfig.server.caching.maxAge.wilson;
    var useCache = wilsonConfig.server.caching.useServerCache;

    if (useCache) {
      res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
      res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);
    }

    res.sendFile(path.join(__dirname, '../client/client.wilson.plugins.js'));
  });
  router.get('/:version?/client.wilson.plugins.min.js', function(req, res) {
    //Set max age headers based on config for wilson (NOTE: maxAgeMs is millis, so we divide to specify seconds)
    var maxAgeMs = wilsonConfig.server.caching.maxAge.wilson;
    var useCache = wilsonConfig.server.caching.useServerCache;

    if (useCache) {
      res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
      res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);
    }

    res.sendFile(path.join(__dirname, '../client/client.wilson.plugins.min.js'));
  });

  // BUNDLES
  router.get('/:version?/bundle/:name?', container.get('routes/bundle'));

  // CORE TEMPLATES
  router.get('/:version?/templates/:tagHash?', [
    getTagFromHashMiddleware,
    I18NModule.i18nConfigMiddleware,
  ], container.get('routes/templates'));


  // COMPONENTS
  router.get('/:version?/component/:name/:tagHash?', [
      getTagFromHashMiddleware,
      I18NModule.i18nConfigMiddleware
    ], container.get('routes/component'));


  //  __        ___ _                   __  __           _       _        __  __      _   _               _
  //  \ \      / (_) |___  ___  _ __   |  \/  | ___   __| |_   _| | ___  |  \/  | ___| |_| |__   ___   __| |___
  //   \ \ /\ / /| | / __|/ _ \| '_ \  | |\/| |/ _ \ / _` | | | | |/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //    \ V  V / | | \__ \ (_) | | | | | |  | | (_) | (_| | |_| | |  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //     \_/\_/  |_|_|___/\___/|_| |_| |_|  |_|\___/ \__,_|\__,_|_|\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //

  //JS SCRIPTS
  function getClientScripts(config, pluginsMarkup) {
    var localConfig         = config || wilsonConfig;
    var assetPath           = localConfig.client.app.assetPath;
    var versionedAssetPath  = localConfig.client.app.versionedAssetPath;
    var cdnHost             = localConfig.client.cdn ? localConfig.client.cdn.protocol + '://' + localConfig.client.cdn.host : '';
    var clientResource      = {
      clientApp:      localConfig.server.projectPaths.clientApp,
      routeService:   _useExplicitRouteService ? localConfig.server.projectPaths.routeService : false
    };

    if (localConfig.client.app.useVersionedAssets) {
      _.each(clientResource, function(value, key) {
        if (value) { clientResource[key] = value.replace(assetPath, versionedAssetPath); }
      });

      var scriptReplaceRegex = new RegExp('src="' + assetPath + '([^"]+)"', 'g');

      pluginsMarkup = pluginsMarkup.replace(scriptReplaceRegex, 'src="' + versionedAssetPath + '$1"');

      // Apply CDN if applicable
      if (cdnHost) {
        var relativeSrcRegex = new RegExp('src="(\/[^"]+)"', 'g');
        pluginsMarkup = pluginsMarkup.replace(relativeSrcRegex, 'src="' + cdnHost + '$1"');
      }
    }
    
    // Add nonce if it exists and is not present in the tag
    if (localConfig.client.nonce) {
      var nonceRegex = new RegExp('<script (?!nonce)', 'g');
      pluginsMarkup = pluginsMarkup.replace(nonceRegex, '<script nonce="' + localConfig.client.nonce + '" ');
    }

    return _wilsonScriptsTemplate({
      nonce:          localConfig.client.nonce,
      cdnHost:        cdnHost,
      mountpath:      localConfig.client.app.mountpath,
      minified:       localConfig.server.deploy.mode === 'production',
      connectionHash: localConfig.client.app.connectionFilters,
      version:        localConfig.client.app.version,
      routeService:   clientResource.routeService,
      clientApp:      clientResource.clientApp,
      pluginsMarkup:  pluginsMarkup || ''
    });
  }

  //HANDLEBARS
  function registerHandlebarsHelpers(hbs) {
    hbs.localsAsTemplateData(app);

    // Handlebars JSON helper
    hbs.registerHelper('json', function(obj) {
      return JSON.stringify(obj);
    });

    hbs.registerHelper('wilsonScripts', function(config, options) {
      return getClientScripts(config, options.fn(this));
    });

    I18NModule.registerHandlebarsHelpers(hbs);
  }

  registerHandlebarsHelpers(hbs);

  /**
   * Wilson
   */
  return {
    config: wilsonConfig,
    routeInfo: {},
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
    getClientScripts:           getClientScripts,
    registerHandlebarsHelpers:  registerHandlebarsHelpers,
    component: _.noop
  };
};

export default wilson;