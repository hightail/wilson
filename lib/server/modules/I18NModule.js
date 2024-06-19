var i18next = require('i18next'),
    middleware = require('i18next-http-middleware'),
    asyncUtil     = require('async'),
    _             = require('../utils/HtLodash'),
    fs            = require('fs'),
    hbs           = require('hbs'),
    Q             = require('q'),
    strip         = require('strip-json-comments'),
    url           = require('url'),
    path          = require('path');

module.exports = function(wilsonConfig, logger, ComponentService) {
  // any path that starts with xx or xx-YY is considered a locale
  var PATH_LOCALE_REGEXP = /^([a-z]{2}|[a-z]{2}-[a-zA-Z]{2})$/i;

  //TODO: This is a super hacky global, recode getLocaleFromUrl() to remove this
  var redirectUrl;

  var projectPaths= wilsonConfig.server.projectPaths;
  var localesPath = path.join(projectPaths.root, projectPaths.locales);

  //The namespaces for this app
  var translationNamespaces = [];

  //Load routing info
  var routingJson = require(path.join(projectPaths.root, projectPaths.routes));

  //Dictionary of locale resources
  var resStore = {};

  // i18next configuration
  var i18nextOptions = {
    // do not set namespace here; we'll add them dynamically for each component later
    ns: 'wilson', // give i18next something so it won't complain
    fallbackNS: false,
    nsSeparator: ':::',
    keySeparator: '::',
    fallbackLng: 'en',
    // can't preload anymore because we don't know what brand to load languages for until run time
    // but good to keep this here so we know preload exists
    //preload: supportLngs, // must preload, or in prodution mode it won't work reliably
    supportedLngs: ['en'],
    saveMissing: true, // on client side, use sendMissing
    saveMissingTo: 'all',
    debug: false
  };

  // Merge in Wilson config settings with defaults
  _.mergeAll(i18nextOptions, wilsonConfig.client.i18n);


  /**
   * Registers HBS helper "__" to handle translations in hbs templates
   */
  function registerHandlebarsHelpers(hbsRef) {
    // i18n basic helper
    hbsRef.registerHelper('__', function(key, options) {
      //Note: 'this' refers to the context object that is passed in by
      //hbs.template(). This object has 'ns' passed in by in ComponentService
      var i18nOptions = this;

      // for plural, i18next expects an integer for count
      // this is not a hack; just being accomodating...
      //  if (options.hash.count && typeof options.hash.count !== 'number') {
      //    options.hash.count = parseInt(options.hash.count, 10);
      //  }

      //extend the context object with options.hash passed in by the helper
      _.extend(i18nOptions, options.hash);

      //console.log('i18nOptions', i18nOptions);

      return new hbsRef.SafeString(i18next.t(key, i18nOptions));
    });
  }

  /**
   * Initializes the I18NModule for the given @app
   *
   * @param app
   */
  function init(app) {
    // development only
    if (app.get('env') === 'development') {
      //Uncomment this if you want i18n debugging output
      //i18nextOptions.debug = true;

      //app.use(express.errorHandler());

      //console.log('wilsonConfig.client.i18n.supportedLngs', i18nextOptions.supportedLngs);

      // create a folder for each of the supportedLngs if not existed
      _.each(i18nextOptions.supportedLngs, function (lng) {
        var lngFolder = path.join(localesPath, lng);
        if (!fs.existsSync(lngFolder)) {
          logger.info('Create missing folder:', lngFolder);
          fs.mkdirSync(lngFolder);
        }
      });
    }

    i18next.use(middleware.LanguageDetector).init(i18nextOptions);

    translationNamespaces = ComponentService.getComponentNames();
    if (i18nextOptions.extraNamespaces) {
      translationNamespaces = translationNamespaces.concat(i18nextOptions.extraNamespaces);
    }

    //console.log('translationNamespaces', translationNamespaces);
    // load each component name as namespace in i18next
    i18next.loadNamespaces(translationNamespaces, function() {
      //Keep a reference to the default resources
      logger.info('loaded i18next namespaces: ', translationNamespaces);
      //console.log('defaultResStore', defaultResStore);
    });

    registerHandlebarsHelpers(hbs);
  }

  function handleMiddleware() {
    return middleware.handle(i18next);
  }

  /**
   * I18NModule
   */
  return {
    init: init,
    handle: handleMiddleware,
    registerHandlebarsHelpers: registerHandlebarsHelpers
  };
}