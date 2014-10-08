var i18next = require('i18next'),
    asyncUtil = require('async'),
    _ = require('lodash'),
    fs = require('fs'),
    hbs = require('hbs'),
    Q = require('q'),
    strip    = require('strip-json-comments'),
    url = require('url'),
    path = require('path');

module.exports = function(wilsonConfig, logger, ComponentService, hidash) {
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
    fallbackToDefaultNS: false,
    nsseparator: ':::',
    keyseparator: '::',
    useCookie: false,
    fallbackLng: 'en',
    // can't preload anymore because we don't know what brand to load languages for until run time
    // but good to keep this here so we know preload exists
    //preload: supportLngs, // must preload, or in prodution mode it won't work reliably
    supportedLngs: ['en'],
    saveMissing: true, // on client side, use sendMissing
    sendMissingTo: 'all',
    resSetPath: localesPath + '/__lng__/__ns__.json',
    resGetPath: localesPath + '/__lng__/__ns__.json',
    debug: false
  };

  //Merge in Wilson config settings with defaults
  hidash.mergeAll(i18nextOptions, wilsonConfig.client.i18n);


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

    i18next.init(i18nextOptions);

    translationNamespaces = ComponentService.getComponentNames();
    if (i18nextOptions.extraNamespaces) {
      translationNamespaces.concat(i18nextOptions.extraNamespaces);
    }

    //console.log('translationNamespaces', translationNamespaces);
    // load each component name as namespace in i18next
    i18next.loadNamespaces(translationNamespaces, function() {
      //Keep a reference to the default resources
      logger.info('loaded i18next namespaces: ', translationNamespaces);
      //console.log('defaultResStore', defaultResStore);
    });

    i18next.registerAppHelper(app);

    i18next.serveClientScript(app)
      .serveDynamicResources(app)
      .serveMissingKeyRoute(app);

    registerHandlebarsHelpers(hbs);
  }

  /**
   * Returns the file path to the resource file for the given params
   *
   * @param language
   * @param componentName
   * @returns {String}
   */
  var getResourceFilePath = function(language, componentName) {
    return path.join(localesPath, language, componentName + '.json');
  };

  /**
   * getI18nResourceStore
   *
   * Returns an promise that we can pass into i18next as resource bundle.
   *
   * @param namespaces list of i18next namespaces to load resource for
   * @returns {Object}
   */
  function getI18nResourceStore(lng, namespaces) {
    var deferred = Q.defer();

    //check if we already have the resources for this language
    if (resStore[lng]) {
      deferred.resolve(resStore);
    } else {
      resStore[lng] = {};

      //Collection of missing namespace JSON by brand
      var missingNameSpaces = [];

      //load try to load each namespace JSON in parellel
      asyncUtil.eachLimit(namespaces, 40, function (namespace, callback) {
        var resourceFilePath = getResourceFilePath(lng, namespace);

        //console.log(_.str.strRight(resourceFilePath, 'client/'));

        var fileExists = fs.existsSync(resourceFilePath);

        if (fileExists) {
          var namespaceFileContent = fs.readFileSync(resourceFilePath, 'utf8');

          //logger.info(typeof namespaceFileContent);
          //logger.info(namespaceFileContent);

          try {
            var namespaceJson = JSON.parse(strip(namespaceFileContent));

            //Merge the translations on top of any previous ones
            if (resStore[lng] && resStore[lng][namespace]) {
              hidash.mergeAll(resStore[lng][namespace], namespaceJson);
            } else {
              resStore[lng][namespace] = namespaceJson;
            }
          } catch (err) {
            resStore[lng][namespace] = {};
            logger.error('Error parsing locale file', resourceFilePath, err);
          }
          callback();
        } else {
          //No JSON exists for this namespace
          missingNameSpaces.push(namespace);
          callback();
        }
      }, function (err) {
        // This is a callback for when all resourceFiles have been read
        if (missingNameSpaces.length > 0) {
          logger.warn('Resource bundle JSON not found for the following namespaces');
          logger.warn(missingNameSpaces);
        }

        //resolve the promise
        if (err) {
          logger.error('ERROR Loading I18N files!!!');
          deferred.reject();
        } else {
          deferred.resolve(resStore);
        }
      });
    }

    return deferred.promise;
  };

  function loadResourcesForLanguage(lng) {
    return getI18nResourceStore(lng, i18next.options.ns.namespaces)
      .then(function(resStore) {
        // as of i18next-1.7.3, there is no api to do this so we edit the i18next object directly
        i18next.sync.resStore[lng] = resStore[lng];

        return resStore;
      });
  }

  /**
   * Returns a localized route
   *
   * @param locale
   * @param urlPath
   * @returns {*}
   */
  function getLocalizedPath(locale, urlPath) {
    return path.join('/' + locale, urlPath);
  }

  /**
   * Returns application routes for the given @lng
   *
   * @param lng
   * @returns {*}
   */
  function getLocalizedRoutes(lng) {
    var defaultLng = wilsonConfig.client.i18n.defaultLng;

    var localizedRoutes = _.cloneDeep(routingJson.routes);

    if (lng && lng !== defaultLng) {
      _.each(localizedRoutes, function(route) {
        if (!_.isNull(route.path)) {
          route.path = getLocalizedPath(lng, route.path);

          //TODO:Justin
          //This should be moved to wilson-config as 'routing-option-path-attrs' or something
          var pathKeys = ['loggedInRedirect', 'loggedOutRedirect'];
          if (route.options) {
            _.each(pathKeys, function(pathKey) {
              var pathValue = route.options[pathKey];
              if (pathValue) {
                route.options[pathKey] = getLocalizedPath(lng, pathValue);
              }
            });
          }
        }
      });
    }

    return localizedRoutes;
  }

  /**
   * Returns a locale given a @requestUrl
   *
   * ex:
   * / => en (defaultLng)
   * /en => en
   * /de/path/to/somthing => de
   *
   * @param requestUrl
   * @param defaultLocale
   * @returns {*}
   */
  function getLocaleFromUrl(requestUrl, defaultLocale) {
    // default locale if none is passed in the url e.g. /send will be come /en/send
    var locale = defaultLocale;
    var supportedLocales = wilsonConfig.client.i18n.supportedLngs;

    // reset this each time
    redirectUrl = null;

    var urlParts = url.parse(requestUrl);
    var pathParts = urlParts.pathname.split('/');


    var match = pathParts[1].match(PATH_LOCALE_REGEXP);
    // Check for the matched local
    var matchedLocale           = match && match[0] ? match[0] : false;
    var matchedLocaleSupported  = _.contains(supportedLocales, matchedLocale);

    // If our locale is not in the list and we have a two part locale, then try just the lang
    var matchedLng = false;
    var matchedLngSupported = false;
    if (matchedLocale && !matchedLocaleSupported && (matchedLocale.indexOf('-') !== -1)) {
      matchedLng = matchedLocale.split('-')[0];
      matchedLngSupported = _.contains(supportedLocales, matchedLng);
    }

    if ((matchedLocale && !matchedLocaleSupported) || (matchedLocale && matchedLocaleSupported && matchedLocale === defaultLocale)) {
      // Ok we are either not supported or the default... if we are not supported and we matched a supported lang then use it to redirect
      if (!matchedLocaleSupported && matchedLng && matchedLngSupported && matchedLng !== defaultLocale) {
        pathParts.splice(1, 1, matchedLng); // remove the unsupported locale and replace with lng
        locale = matchedLng;
      } else {
        pathParts.splice(1, 1); // just remove the unsupported locale
      }

      //construct redirect url
      redirectUrl = pathParts.join('/') || '/';
      //append any search parameters
      if (urlParts.search && urlParts.search !== '?') {
        redirectUrl += urlParts.search;
      }
    } else if (matchedLocale && matchedLocaleSupported) {
      locale = matchedLocale;
    }

    return locale;
  };

  /**
   * Middleware that sets req.wilson.i18n to contain necessary I18N info
   *
   * @param req
   * @param res
   * @param next
   */
  function i18nConfigMiddleware(req, res, next) {
    //Get the current language
    var lng = req.wilson.tags.language;

    //Create i18n info for the request
    var reqI18N = req.wilson.i18n = {};

    //Update the Routes to include the locale in the path
    req.wilson.routes = getLocalizedRoutes(lng);

    // Configure per request I18N info
    reqI18N.lng = lng;
    reqI18N.namespaces = translationNamespaces;
    reqI18N.resStore = {};

    loadResourcesForLanguage(lng).then(
      function(resStore) {
        reqI18N.resStore[lng] = resStore[lng];

        next();
      },
      function(error) {
        logger.error('Error loading resources for ' + lng);
        logger.error(error);

        next();
      }
    );

  }

  /**
   * Middleware that sets req.wilson.tags.language to be the client locale based on locale in the URL
   *
   * @param req
   * @param res
   * @param next
   */
  function getLanguageFromUrlMiddleware(req, res, next) {
    //console.log('req.locale', req.locale);
    var defaultLng = req.locale || wilsonConfig.client.i18n.defaultLng;
    var lng = getLocaleFromUrl(req.url, defaultLng);

    //console.log('lng', lng);
    if(redirectUrl) {
      //If the language in the URL is something weird, redirect to make things pretty
      res.redirect(redirectUrl);
      res.end();
    } else {
      //Set language tag
      req.wilson.tags.language = lng;
      next();
    }
  }

  /**
   * I18NModule
   */
  return {
    init: init,
    handle: i18next.handle,
    i18nConfigMiddleware: i18nConfigMiddleware,
    getLanguageFromUrlMiddleware: getLanguageFromUrlMiddleware,
    registerHandlebarsHelpers: registerHandlebarsHelpers
  };
}