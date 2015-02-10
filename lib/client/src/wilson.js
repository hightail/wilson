/**
 * Wilson
 *
 * Hightail Framework wrapper for creating behaviors, services, components, and filters on the hightail app module.
 *
 * Wraps the creation of angular directives, filters and services to provide a clean syntax for developers to quickly
 * create these app building blocks.
 *
 * @class angular.wilson
 *
 * @author hunter.novak
 * @author justin.fiedler
 * @author dan.nguyen
 *
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved.
 */
'use strict';

(function(window, angular, _) {
  var _appConfig = null;
  var _routeProvider = null;
  var _cache = { components: {}, behaviors: {}, services: {}, parsers: {}, filters: {}, guides: {} };

  var _compileProvider    = null;
  var _controllerProvider = null;
  var _provider           = null;

  /**
   * The main Wilson module
   */
  var wilsonModule = angular.module('wilson', ['ngRoute', 'LocalStorageModule', 'wilson.config', 'wilson.i18n', 'wilson.prerender'])
    .config(['$interpolateProvider', '$locationProvider', 'i18nextServiceProvider', '$routeProvider', 'localStorageServiceProvider', '$compileProvider', '$controllerProvider', '$provide',
      function($interpolateProvider, $locationProvider, i18nextServiceProvider, $routeProvider, localStorageServiceProvider, $compileProvider, $controllerProvider, $provide) {

        var config = angular.wilson.config;

        // Store our Providers
        _compileProvider    = $compileProvider;
        _controllerProvider = $controllerProvider;
        _provider           = $provide;

        // use square brackets so they don't collide with handlebars;
        // plus, square goes with angular... get it?
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');

        // Configure the i18n provider
        i18nextServiceProvider.init({
          lng: config.i18n.lng,
          resStore: config.i18n.resStore,
          ns: {
            namespaces: config.i18n.namespaces
          },
          fallbackToDefaultNS: false,
          nsseparator: ':::',
          keyseparator: '::',
          useCookie: false,
          useLocalStorage:            config.i18n.useLocalStorage, // need to be true in production
          localStorageExpirationTime: config.i18n.localStorageExpirationTime,
          supportedLngs:              _.pluck(config.i18n.supportedLngs, 'locale'),
          languageData:               config.i18n.supportedLngs,
          fallbackLng:                config.i18n.fallbackLng,
          sendMissing:                config.i18n.sendMissing, // need to be false in prod
          sendMissingTo: 'all',
          resPostPath: '/locales/add/__lng__/__ns__',
          resSetPath: '/client/locales/__lng__/__ns__.json',
          resGetPath: '/client/locales/__lng__/__ns__.json'
        });

        localStorageServiceProvider.setPrefix(config.app.localStoragePrefix || 'wilson');

        $locationProvider.html5Mode(true).hashPrefix('!');

        //store reference to the route
        _routeProvider = $routeProvider;

        // Define Application URL Routes
        _.each(config.routes, function(routeInfo) {
          route(routeInfo);
        });

        // Catch All Route for 404 -- DO NOT EDIT! MUST BE LAST ROUTE!!  -- ADDED TEMPORARY phiRedirect for any 404 hits
        if (config.routes && config.routes.length > 0) {
          //route({ path: null, name: '404', component: '404', state: '404', options: { redirect: config.deploy.phiUrl + '/404' } });
        }

        //remove the ref to $routeProvider
        _routeProvider = null;

      }]).run(['$rootScope', '$templateCache', '$location', 'localStorageService', function($rootScope, $templateCache, $location, localStorageService) {

      $rootScope.page = {
        title: 'Wilson'
      };


      /**
       * Add Safe Apply Method to Root Scope
       *
       * @param fn
       */
      $rootScope.safeApply = function safeApply(fn) {
        var phase = this.$root.$$phase;
        if (phase === '$apply' || phase === '$digest') {
          if (fn && (typeof(fn) === 'function')) {
            fn();
          }
        } else {
          this.$apply(fn);
        }
      };


      /**
       * Add Binding method for safeApplied functions
       *
       * @param method
       * @param context
       * @returns {*}
       */
      $rootScope.bindToSafeApply = function bindToSafeApply(method, context) {
        context = context || this;

        if (method) {
          // Return the method to be wrapped in a $rootScope.safeApply
          return function() {
            var args = arguments;
            $rootScope.safeApply(function() { method.apply(context, args); });
          };
        }

        return function() {};
      };


      /**
       * Redirects to @path but will retry the current $location.path() on refresh
       *
       * @param path  The path to redirect too
       */
      var redirecting = false;
      var doRetryRedirect = function(path) {
        if (!redirecting) {
          var currentPath = $location.path();
          redirecting = true;

          //add retryRoute value to localStorage
          localStorageService.add('retryRoute', { path: path, originalPath: currentPath, attempt: 0 });

          //do the redirect
          $location.path(path);
        }
      };

      $rootScope.$on('$routeChangeSuccess', function(event, args) {
        redirecting = false;
      });

      angular.wilson.doRetryRedirect = doRetryRedirect;
    }]);

  /**
   * Get IE version number.
   */
  var getMSIEVersion = function() {
    var ua = typeof navigator.userAgent === 'string' ? navigator.userAgent.toLowerCase() : navigator.userAgent;
    var msie = parseInt((/msie (\d+)/.exec(ua) || [])[1], 10);

    if (isNaN(msie)) {
      // IE11
      msie = parseInt((/trident\/.*; rv:(\d+)/.exec(ua) || [])[1], 10);
    }

    return msie;
  };

  /**
   * Validates parameters of the given type module definition.
   *
   * @private
   * @method validateParams
   * @param type
   * @param name
   * @param definition
   * @param link
   */
  var validateParams = function(type, name, definition, link) {
    // Validate Basic Name String Here
    if (!_.isString(name)) {
      throw new Error(type + ' name must be a string!!!');
    }

    // Validation Check Methods
    var checkBasicDef = function() {
      if (!_.isFunction(definition) || getDefinitionParams(definition).length) {
        throw new Error(type + ' [' + name + '] definition must be a Function with no arguments!!');
      }
    };

    var checkNgDef = function() {
      // Check for Function or Array
      if (!_.isFunction(definition) && !_.isArray(definition)) {
        throw new Error(type + ' [' + name + '] definition must be a Function or an Array!!!');
      } else if (_.isFunction(definition) && getDefinitionParams(definition).length) {
        throw new Error(type + ' [' + name + '] definition with params (i.e. injections) MUST be defined as an Array!!');
      }

      if (link && !_.isFunction(link)) {
        throw new Error(type + ' link method must be a function!!!');
      }
    };

    var checkBasicFunctionDef = function() {
      if (_.isArray(definition)) {
        //ignore Arrays to allow for dependency injection
      } else if (!_.isFunction(definition)) {
        throw new Error(type + ' [' + name + '] definition must be a Function what at least 1 argument!!');
      }
    };

    var validateSimpleName = function(type, name) {
      var nameFormat = new RegExp('^' + type + '.+$');
      if (!nameFormat.test(name)) {
        throw new Error(type + ' name [' + name + '] does not match format [*-' + type + ']. Expected [' + name + '-' + type + ']. Please update the name to the proper format.');
      }
    };

    var validateClassName = function(type, name) {
      var suffix = _.string.classify(type);
      if (type === 'service') {
        suffix = '[Service|Factory|Utility|Resource]';
      }
      var formalName = _.string.classify(name);
      var nameFormat = new RegExp('^.+' + suffix + '$');
      if (!nameFormat.test(name)) {
        throw new Error(type + ' name [' + name + '] does not match format [*' + suffix + ']. Expected [' + formalName + suffix + ']. Please update the name to the proper format.');
      }
    };

    var getDefinitionParams = function(func) {
      var def = func.toString().match(/\(.*?\)/)[0].replace(/[()]/gi,'').replace(/\s/gi,'').split(',');
      return _.without(def, '');
    };

    // Validate Based on Type
    if (type) {
      switch (type) {
        case 'service':
          checkNgDef();
          validateClassName(type, name);
          break;
        case 'behavior':
        case 'filter':
          checkBasicFunctionDef();
          break;
        case 'parser':
          checkBasicFunctionDef();
          validateClassName(type, name);
          break;
        case 'guide':
          checkBasicDef();
          validateSimpleName(type, name);
          break;
        default:
      }
    } else {
      throw new Error('Failed to validate definition params. Type is null or undefined!!');
    }

  };


  /**
   * Flag to represent whether the routing window is open.
   *
   * @private
   * @property isLegalRoutingWindow
   * @type {boolean}
   */
  var isLegalRoutingWindow  = true;

  /**
   * Sets the app config object.
   *
   * @public
   * @method setAppConfig
   * @param config
   */
  var setAppConfig = function(config) {
    wilson.config = _appConfig = config;
  };

  /**
   * Embellishes a given model object with the properties of another object. Essentially
   * an extended object is created with a merged property set. Note: overriding is not
   * allowed and explicitly throws an error if there are overlapping properties.
   *
   * @public
   * @method embellishModel
   * @param modelData
   * @param embellishments
   *
   * @returns {object} - The embellished object
   */
  var embellishModel = function(modelData, embellishments) {
    var overrides = _.intersection(_.keys(modelData), _.keys(embellishments));
    if (overrides.length) {
      throw new Error('Cannot Override Original Model POJO Properties!!');
    }

    var extended = _.extend(modelData, embellishments);
    return extended;
  };


  /**
   * Finds the matching route configuration object for the given path. Returns the "options" for
   * the matching route
   *
   * @param path
   * @returns {Object}
   */
  var getRouteOptions = function(path) {
    var routeConfig;

    // find the matching route configuration for the given path
    routeConfig = _.find(wilson.config.routes, function(route) {
      var isMatchingRoute = false;

      if (!_.isNull(route.path)) {
        var routeParts = route.path.split('/');
        var pathParts = path.split('/');

        // any path that starts with xx or xx-YY is considered a locale
        var isIntlPath = pathParts[1].match(/^([a-z]{2}|[a-z]{2}-[a-z]{2})$/i);

        isMatchingRoute = (path === route.path) ||
          (!isIntlPath && pathParts[1] === routeParts[1]) ||
          (isIntlPath && pathParts[2] === routeParts[2]);
      }

      return isMatchingRoute;
    });

    // If no matching route was found then default to the null path route
    if (_.isUndefined(routeConfig)) {
      routeConfig = _.findWhere(wilson.config.routes, { path: null });
    }

    // return the options from the matching route
    return (routeConfig && routeConfig.options) ? _.clone(routeConfig.options) : { };
  };

  /**
   * Define a route for the application from a given path and resulting state. The
   * given path will become a route that will map to the given state. The site control
   * component will then use the mapped state for a route to load the appropriate top-level
   * workflow component and compile it into the view.
   *
   * @public
   * @method route
   * @param path
   * @param state
   */
  var route = function(routeInfo) {
    if (_routeProvider && isLegalRoutingWindow) {
      // Make sure this route info object is correctly defined
      if (_.isUndefined(routeInfo.path)) {
        throw new Error('Route information is invalid! Missing path definition: \n' + JSON.stringify(routeInfo, undefined, 2));
      }

      var isLocalRoute = true;

      // Add Dynamic Routing Data
      var routingData = {
        controller: 'ht' + _.string.classify(routeInfo.component),
        resolve: {
          routeLabel: [function() {
            return routeInfo.label || routeInfo.component;
          }],
          routeInfo: ['$route', '$q', '$location', 'AppStateService', 'IRouteService',
            function($route, $q, $location, AppStateService, IRouteService) {
              var deferred = $q.defer();
              var currentRoute = $location.path();
              var options = getRouteOptions(currentRoute);

              //Make a call to IRouteService. This is a service interface to handle any app specific routing
              isLocalRoute = IRouteService.handleRouteChange(currentRoute, options, routeInfo);

              if (!isLocalRoute) {
//              $(angular.wilson.config.app.appLoaderSelector || '.loading-screen').css('display', 'block');
                deferred.reject();
              }

              // Write routeInfo to localStorage for this component
              var resolvedRouteInfo = {};

              if (_.isObject(options.defaultParams)) {
                resolvedRouteInfo = _.extend(options, options.defaultParams, $route.current.params);
              } else {
                resolvedRouteInfo = _.extend(options, $route.current.params);
              }

              AppStateService.setPersistentValues(routeInfo.component, resolvedRouteInfo);

              deferred.resolve(resolvedRouteInfo);

              return deferred.promise;
            }],
          $template: ['ComponentLoaderService', '$route', '$q', '$window', '$templateCache', '$rootScope', 'IRouteService',
            function(ComponentLoaderService, $route, $q, $window, $templateCache, $rootScope, IRouteService) {
              var deferred = $q.defer();

              if (!isLocalRoute) {
                // Return and let the non local route resolve
                return deferred.promise;
              }

              // Update page title
              if (routeInfo.title) {
                $rootScope.page.title = IRouteService.translateTitle(routeInfo.title);
              } else {
                delete $rootScope.page.title;
              }

              ComponentLoaderService.load(routeInfo.component).then(function(data) {

                // Force a reload to update if out of date component
                if (data.version !== angular.wilson.config.app.version) {
                  console.log('Component is out of date! Reloading app.');
                  console.dir(data);
                  $window.location.reload();
                } else {
                  $(wilson.config.app.appLoaderSelector || '.loading-screen').css('display', 'none');
                  deferred.resolve($templateCache.get(routeInfo.component));
                }
              }, function(err) {
                console.log('Failed to load component [' + routeInfo.component + ']: Unknown server error.');
                deferred.reject('<div>Failed to Load!!!</div>');  // Wilson server is down TODO: this may need to be like oops
              });

              return deferred.promise;
            }],
          retryOriginalRoute: ['$location', '$route', 'localStorageService', function($location, $route, localStorageService) {
            var retryRoute    = localStorageService.get('retryRoute');

            // If we have the retryRoute object, then we need to setup our retry
            if (_.isObject(retryRoute) && $location.path() === retryRoute.path) {
              // If this is a subsequent attempt, then continue
              if (retryRoute.attempt > 0) {
                if (retryRoute.originalPath && retryRoute.path !== retryRoute.originalPath) {
                  localStorageService.remove('retryRoute');
                  $location.path(retryRoute.originalPath);
                }
              } else {
                retryRoute.attempt++;
                localStorageService.add('retryRoute', retryRoute);
              }
            } else {
              localStorageService.remove('retryRoute');
            }
          }]
        }
      };

      if (routeInfo.path !== null) {
        _routeProvider.when(routeInfo.path, routingData);
      } else {
        // Since null routes are not allowed in the routes config, lets assume here to error out one is already specified
        var nullRoutes = _.where(wilson.config.routes, { path: null });

        if (nullRoutes && nullRoutes.length === 1) {
          _routeProvider.otherwise(routingData);
          isLegalRoutingWindow = false;   // Once otherwise is set, routing window is closed.

          // Add the null route to the list of configured routes after-the-fact
          wilson.config.routes.push(routeInfo);
        } else {
          // TODO: remember to implement 404 top level configuration
          throw new Error('You can only specify ONE null route in the routes config block!!!', nullRoutes);
        }
      }
    } else {
      var errMsg = 'Cannot create route. No Route Provider set in Wilson!!!';
      if (!isLegalRoutingWindow) {
        errMsg = 'Legal Routing time-frame has passed!! Routing can only be performed upon initial app config!!!';
      }
      throw new Error(errMsg);
    }

    return wilson;
  };

  /**
   * Defines an Wilson component.
   *
   * @public
   * @method define.component
   * @param name    The name of the component (e.g. 'message-bar')
   * @param config  Configuration object for the component. This object will override any
   *                default component values
   */
  var defineComponent = function(name, config) {
    var directiveName = 'ht' + _.string.classify(name);

    if (!_cache.components[directiveName]) {
      _cache.components[directiveName] = true;

      //initialize the config with defaults
      var fullConfig = {
        restrict: 'EA',
        templateUrl: name.toLowerCase(),
        replace:  true, //Cause IE8, bro...
        scope: {}
      };

      //extend default parameters
      _.extend(fullConfig, config);

      // To provide the base component functionality we highjack the controller, and
      // run ComponentFactoryService.init() prior to running the original controller
      var originalController = fullConfig.controller;
      var wilsonController;
      var wilsonLink;

      if(fullConfig.page) {
        //pages don't have a reference to their $element
        wilsonController = ['ComponentFactoryService', '$injector', '$scope', function(ComponentFactoryService, $injector, $scope) {
          var controller = this;

          var $element = angular.element('.ht-' + _.str.slugify(name));
          ComponentFactoryService.init(name, $scope, $element, null, controller);

          $element.data('$WilsonComponentController', controller);

          $injector.invoke(originalController, controller, {
            $scope: $scope,
            $element: $element
          });

          $scope.checkViewDependencies();
        }];
      } else {
        //base components have more dataproviders available
        wilsonController = ['ComponentFactoryService', '$injector', '$scope', '$element', '$attrs', function(ComponentFactoryService, $injector, $scope, $element, $attrs) {
          var controller = this;
          ComponentFactoryService.init(name, $scope, $element, $attrs, controller);

          //Hack/Magic - Register the Wilson component controller on this element
          //This allows us to require: ['WilsonComponent'] in the link method
          $element.data('$WilsonComponentController', controller);

          $injector.invoke(originalController, controller, {
            $scope: $scope,
            $element: $element,
            $attrs: $attrs
          });

          //Register this component as a view dependency of its parent
          $scope.parentComponent.registerViewDependency();
        }];
      }
      //overwrite the existing controller with the Wilson controller
      fullConfig.controller = wilsonController;


      var originalLink = fullConfig.link;
      var wilsonLink;

      //Override the link method to handle view dependcy checking
      if (originalLink) {
        wilsonLink = function($scope, $element, $attrs, ctrl) {
          //console.log('[wilson:link (override)]', $scope.componentCNamme
          originalLink($scope, $element, $attrs, ctrl);

          //$scope.parentComponent.defferedResolveViewDependency();
          $scope.checkViewDependencies();
        }
      } else {
        wilsonLink = function($scope, $element, $attrs, controller) {
          //console.log('[wilson:link (placeholder)]', $scope.componentCName)
          $scope.checkViewDependencies();
        };
      }

      fullConfig.link = wilsonLink;

      // Determine if we are loading this dynamically with compileProvider or controllerProvider
      var provider = false;

      if (fullConfig.page) {
        // Create a new controller for this component
        provider = _controllerProvider || wilsonModule;
        var register = provider.register || provider.controller;
        register(directiveName, fullConfig.controller);
      } else {
        // Create a new directive for the component
        provider = _compileProvider || wilsonModule;
        provider.directive(directiveName, function() {
          return fullConfig;
        });
      }
    }
  };


  /**
   * Defines an Wilson behavior.
   *
   * @public
   * @method define.behavior
   * @param name
   * @param definition
   * @param priority
   */
  var defineBehavior = function(name, config) {
    var directiveName = 'ht' + _.string.classify(name);

    if (!_cache.behaviors[directiveName]) {
      _cache.behaviors[directiveName] = true;

      //Determine if we are loading this dynamically with compileProvider
      var provider = _compileProvider || wilsonModule;

      // If we are dealing with a config object
      if (_.isFunction(config) || _.isArray(config)) {

        //Create a new directive for the component
        provider.directive(directiveName, config);

      } else {
        //initialize the config with defaults
        var fullConfig = {
          restrict: 'A'
        };

        //extend default parameters
        _.extend(fullConfig, config);

        //Create a new directive for the component
        provider.directive(directiveName, function() {
          return fullConfig;
        });
      }
    }
  };


  /**
   * Defines an Wilson filter.
   *
   * @public
   * @method define.filter
   * @param name
   * @param definition
   * @param link
   */
  var defineFilter = function(name, definition) {
    // Validate Param Data
    validateParams('filter', name, definition);
    var filterName = _.string.camelize(name);

    if (!_cache.filters[filterName]) {
      _cache.filters[filterName] = true;

      wilsonModule.filter(filterName, _.isArray(definition) ? definition : function() {
        return definition;
      });
    }
  };


  /**
   * Defines an Wilson service.
   *
   * @public
   * @method define.service
   * @param name
   * @param definition
   */
  var defineService = function(name, definition) {
    // Validate Param Data
    validateParams('service', name, definition);

    if (!_cache.services[name]) {
      _cache.services[name] = true;

      var provider = _provider || wilsonModule;
      provider.factory(name, definition);
    }
  };


  /**
   * Defines an Wilson parser.
   *
   * @public
   * @method define.parser
   * @param name
   * @param parseDefinition
   * @param serializeDefinition
   */
  var defineParser = function(name, parseDefinition, serializeDefinition) {
    // Validate Param Data
    validateParams('parser', name, parseDefinition);

    if (!_cache.parsers[name]) {
      _cache.parsers[name] = true;

      var provider = _provider || wilsonModule;
      provider.factory(name, ['ParserFactoryService', function(ParserFactoryService) {
        var ParserService = ParserFactoryService.create(parseDefinition, serializeDefinition); // Get Parser Service
        return new ParserService();
      }]);
    }
  };


  /**
   * Defines an Wilson guide.
   *
   * @public
   * @method define.guide
   * @param name
   * @param definition
   */
  var defineGuide = function(name, definition) {
    // Validate Param Data
    validateParams('guide', name, definition);

    if (!_cache.guides[name]) {
      _cache.guides[name] = true;

      var provider = _compileProvider || wilsonModule;

      provider.directive(_.string.camelize(name), ['i18nextService', function(i18nextService) {
        return {
          restrict: 'A',

          link: function($scope, $element, $attrs, controller) {
            var getGuide = function() {
              var guideConfig = {
                id: name,
                showPrevButton: true
              };
              return _.extend(guideConfig, definition());
            };

            // Setup Start Event
            $scope.$on(('start-' + name), function(event, args) {
              hopscotch.startTour(getGuide());
            });

            // Setup Stop Event
            $scope.$on(('stop-' + name), function(event, args) {
              hopscotch.endTour();
            });
          }
        };
      }]);
    }
  };

  // Wilson Object used to define framework classes
  var wilson = {
    // Framework utilities methods -- NOTE: All framework utilities should be defined on this namespace
    utils: {
      getMSIEVersion: getMSIEVersion
    },

    // Framework config object
    config: _appConfig,

    // Setters - Getters
    setAppConfig: setAppConfig,

    // Core Framework Methods
    embellishModel: embellishModel,

    // Methods for Defining Framework Objects
    component:  defineComponent,
    filter:     defineFilter,
    behavior:   defineBehavior,
    service:    defineService,
    parser:     defineParser,
    guide:      defineGuide
  };

  //Set Global window instance
  angular.wilson = window.wilson = wilson;
})(this, angular, _);
