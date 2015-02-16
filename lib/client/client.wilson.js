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
;/**
 * Primary Event Class.  Represents an event that can be subscribed to or published by an through an event bus.
 *
 * @class EventTarget
 *
 * @author Nicholas C. Zakas
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @license MIT License
 * @copyright (c) 2010 Nicholas C. Zakas. All Rights Reserved.
 */
'use strict';

(function(window, _) {

  function EventTarget() {
    var _self = this;
    /**
     * The set of listeners for all event types.
     *
     * @private
     * @property _listeners
     * @type Object
     */
    _self._listeners = {};

    /**
     * A random id generated for this instance.
     *
     * @private
     * @property id
     * @type Number
     */
    _self.id = Math.floor(Math.random() * 100) + 1;

    /**
     * Subcribes a listener to a specific event type.
     *
     * @public
     * @method subscribe
     * @param type
     * @param listener
     */
    var subscribe = function(type, listener) {
      if (typeof _self._listeners[type] === 'undefined') {
        _self._listeners[type] = [];
      }

      _self._listeners[type].push(listener);
    };

    /**
     * Publishes an event with a given set of params.
     *
     * @public
     * @method publish
     * @param event
     * @param params
     */
    var publish = function(event, params) {
      if (typeof event === 'string') {
        event = _.extend({}, params, { type: event });
      }
      if (!event.target) {
        event.target = this;
      }

      if (!event.type) {  //falsy
        throw new Error('Event object missing "type" property.');
      }

      if (_self._listeners[event.type] instanceof Array) {
        var listeners = _self._listeners[event.type];
        for (var i = 0, len = listeners.length; i < len; i++) {
          listeners[i].call(this, event);
        }
      }
    };

    /**
     * Unsubscribes a listener from a given event type.
     *
     * @public
     * @method unsubscribe
     * @param type
     * @param listener
     */
    var unsubscribe = function(type, listener) {
      if (_self._listeners[type] instanceof Array) {
        var listeners = _self._listeners[type];
        for (var i = 0, len = listeners.length; i < len; i++) {
          if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
          }
        }
      }
    };

    //Expose the API
    _self.publish = publish;
    _self.subscribe = subscribe;
    _self.unsubscribe = unsubscribe;
  }

  EventTarget.prototype = {
    constructor: EventTarget
  };

  window.EventTarget = EventTarget;
})(this, _);
;/**
 * AppState Service
 *
 * This service stores Global state for the Application.  This state is a combination of
 * Routing, LocalData, etc
 *
 * @class AppStateService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('AppStateService', ['localStorageService', function(localStorageService) {
  /**
   * Retrieves a value from this component's persistent storage
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param defaultValue    The value to return if the @key is not found
   * @returns {*}
   */
  var getPersistentValue = function(localStorageKey, key, defaultValue) {
    var keyValue = defaultValue;

    //get the current localStorage value
    var localStorageValue = localStorageService.get(localStorageKey);

    //If a key is provided then only return the key's value
    if (localStorageValue && key) {
      keyValue = localStorageValue[key];
    }

    //If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) {
      keyValue = defaultValue;
    }


    return keyValue;
  };

  /**
   * Stores @keyValueHash properties under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param keyValueHash
   * @returns {*}
   */
  var setPersistentValues = function(localStorageKey, keyValueHash) {
    //get the current localStorage value
    var state = localStorageService.get(localStorageKey) || {};
    //extend the current values with the new ones
    _.extend(state, keyValueHash);
    //save changes
    localStorageService.add(localStorageKey, state);

    return state;
  };

  /**
   * Stores single @key:@value under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param value
   * @returns {*}
   */
  var setPersistentValue = function(localStorageKey, key, value) {
    var keyValueHash = {};
    keyValueHash[key] =  value;

    setPersistentValues(localStorageKey, keyValueHash);
  };

  // Service Object
  var service = {
    getPersistentValue: getPersistentValue,
    setPersistentValue: setPersistentValue,
    setPersistentValues: setPersistentValues
  };

  return service;
}]);
;/**
 * This factory returns EventBus instances based on an id. New buses are created for any id not yet existing.
 *
 * @class BusFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 */
'use strict';

angular.wilson.service('BusFactoryService',
  function() {
    /**
     * The default value for a bus id if no parent bus exists.
     * @private
     * @property DEFAULT_BUS_ID
     * @type String
     */
    var DEFAULT_BUS_ID = 'default';

    /**
     * The collection of all active event buses.
     * @private
     * @property busCollection
     * @type Object
     */
    var busCollection = {};


    // Service Object
    var service = {

      /**
       * Returns an event bus for a given id. If one does not yet exist
       * under that name, a new one is created for it.
       *
       * @public
       * @method get
       * @param id
       * @return Object - The event bus associated with the given id.
       */
      get: function(id) {
        //If no ID is given return the default bus
        if (id === undefined || id === '' || id === null) {
          id = DEFAULT_BUS_ID;
        }

        //Get the bus by ID
        var bus = busCollection[id];

        //If a bus by that ID doesnt exist, create it
        if (!bus) {
          bus = busCollection[id] = new EventTarget();
          bus.name = id;
        }

        //Return the bus
        return bus;
      }

    };

    return service;
  }
);
;/**
 * This service provides base class extension and default functionality to component controllers.
 *
 * @class ComponentFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *    controller: ['ComponentFactoryService', '$scope', '$attrs',
 *      function(ComponentFactoryService, $scope, $attrs) {
 *        //initialize component functionality
 *        var controller = this;
 *        ComponentFactoryService.init(controller, $scope, $attrs);
 *    }]
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ComponentFactoryService',
  ['$rootScope', '$timeout', 'StateMachineService', 'BusFactoryService', 'i18nextService', 'AppStateService', 'TranslationOverrideService', 'ElementHelperService', 'ComponentPrerenderService', 'DeprecatedFunctionService',
  function($rootScope, $timeout, StateMachineService, BusFactoryService, i18nextService, AppStateService, TranslationOverrideService, ElementHelperService, ComponentPrerenderService, DeprecatedFunctionService) {
    //Get a reference to the DeprecatedFunction class
    var DeprecatedFunction = DeprecatedFunctionService.DeprecatedFunction;

    /**
     * Initializes a Component Controller
     *
     * @method init
     *
     * @param componentName The name of the component
     * @param $scope        Reference to the components $scope
     * @param $element      Reference to the components $element
     * @param $attrs        Reference to the components $attrs
     * @param controller    Reference to the components controller
     */
    var init = function(componentName, $scope, $element, $attrs, controller) {

      /**
       * Cache of text overridden by parent components
       * @type {{}}
       */
      var textOverrides = {};
      /**
       * Cache of text NOT overridden by parent components
       * @type {{}}
       */
      var ignoredTextOverrides = {};

      //set component name on the scope
      $scope.componentCName = controller.componentCName = componentName;

      //Get the scope of our parent component
      var parentScope = $scope.$parent;
      //keep going through the scope hierarchy until we find a component scope
      while (parentScope && !_.has(parentScope, 'componentCName')) {
        parentScope = parentScope.$parent;
      }

      //Expose parent component scope
      $scope.parentComponent = parentScope;

      // set parent scope to non-component if necessary
      if (!parentScope) {
        parentScope = $scope.$parent;
      }

      /**
       * If we are given 'expose' name then expose the component isolate scope on the $parent scope
       */
      var exposeName = $attrs ? $attrs.expose : false;
      if (exposeName) {
        parentScope[exposeName] = $scope;
      }

      /**
       * If we are given 'expose-ctrl' name then expose the component controller on the $parent scope
       */
      var exposeCtrlName = $attrs ? $attrs.exposeCtrl : false;
      if (exposeCtrlName) {
        parentScope[exposeCtrlName] = controller;
      }

      /**
       * Event Bus Object
       *
       * @property $scope.eventBus
       * @for HtComponent
       * @type Object - Event Bus
       */
      //Check for a parent eventBus to use
      $scope.eventBus = parentScope ? parentScope.eventBus : BusFactoryService.get();

      //If there is still no event bus, use the default
      if (!$scope.eventBus) {
        $scope.eventBus = BusFactoryService.get();
      }


      /**
       * Translates given text based on the set language.
       *
       * @public
       * @method translate
       * @for HtComponent
       * @param text        The text to translate
       * @param options     Translation options (e.g. { ns:'my-namespace', count: 1})
       *
       * @async
       */
      $scope.translate = controller.translate = function(text, options) {
        //create a default callback if needed
        options = options || {};

        // default namespace is component name
        if (typeof options.ns !== 'string' || options.ns === '') {
          options.ns = componentName;
        }

        if (!ignoredTextOverrides[text]) {
          //check if the text has an override
          if (textOverrides[text]) {
            options.ns = textOverrides[text];
            //console.log('component translation found! ns:', options.ns);
          } else if (TranslationOverrideService.hasOverride(options.ns, text)) {
            //the text has an override, now determine if it applies to this component
            for (var ancestor = $scope.parentComponent; ancestor !== null; ancestor = ancestor.parentComponent) {
              if (TranslationOverrideService.hasOverrideForNamespace(options.ns, text, ancestor.componentCName)) {
                options.ns = textOverrides[text] = ancestor.componentCName;
                break;
              }
            }

            //If the namespace is still set to this component then mark as ignored
            if (options.ns === componentName) {
              ignoredTextOverrides[text] = true;
            }
            //console.log(_.str.sprintf('override exists! ns: %s  value:%s', options.ns, i18nextService.translate(text, options)));

          }
        }

        //use the i18n provider to translate the text
        return i18nextService.translate(text, options);
      };

      /**
       * Wrapper function to add the locale in front of a path/route
       *
       * @public
       * @method realPath
       * @for HtComponent
       * @param path        The relative url path
       *
       * @async
       */
//      $scope.realPath = function(path) {
//        return UrlUtility.getLocalizedPath(path);
//      };
 
      /**
       * Marks the @textKey in @overrideNamespace to be overridden with @overrideText
       *
       * e.g.
       * In send.js
       * controller
       *
       * @param overrideNamespace
       * @param textKey
       * @param overrideText
       */
      controller.overrideText = function(overrideNamespace, textKey, overrideText) {
        TranslationOverrideService.addOverride(overrideNamespace, componentName, textKey);

        //call translate to add the translation to the locale JSON
        controller.translate(textKey, { defaultValue: overrideText });

        //console.log('key:' + textKey + ' value: ' + controller.translate(textKey));
      };

      /**
       * State Machine Object
       * @property $scope.stateMachine
       * @for HtComponent
       * @type Object
       */
      $scope.stateMachine = {
        current: 'NoStateMachine'
      };

      /**
       * Convience method to track a new 'tracking-service' event
       *
       * @param args  Any arguments you want to dispatch with the event
       */
      $scope.trackEvent = function(eventName) {
        var args = _.toArray(arguments);
        if (args && args.length > 0) {
          //dispatch event '<componentName>:<eventName>'
          args[0] = 'tracking-service:' + args[0];
          $scope.$emit.apply($scope, args);
        } else {
          throw new Error('trackEvent: eventName is required');
        }
      };

      /**
       * Convenience function to EMIT a event that is namespaced to this component
       *
       * E.g. In the 'log-in' component $scope.emitComponentEvent('success') will
       * emit an event named 'log-in:success'
       *
       * @param eventName
       * @param args
       */
      $scope.emitComponentEvent = function(eventName) {
        var args = _.toArray(arguments);
        if (args && args.length > 0) {
          //dispatch event '<componentName>:<eventName>'
          args[0] = componentName + ':' + args[0];
          $scope.$emit.apply($scope, args);
        } else {
          throw new Error('emitComponentEvent: eventName is required');
        }
      };

      /**
       * Convenience function to BROADCAST a event that is namespaced to this component
       *
       * E.g. In the 'log-in' component $scope.broadcastComponentEvent('success') will
       * broadcast an event named 'log-in:success'
       *
       * @param eventName
       * @param args
       */
      $scope.broadcastComponentEvent = function(eventName) {
        var args = _.toArray(arguments);
        if (args && args.length > 0) {
          //dispatch event '<componentName>:<eventName>'
          args[0] = componentName + ':' + args[0];
          $scope.$broadcast.apply($scope, args);
        } else {
          throw new Error('broadcastComponentEvent: eventName is required');
        }
      };

      /**
       * Sets @scopePropertyName on $scope to @defaultValue if it is not already set
       *
       * @param scopePropertyName
       * @param defaultValue
       * @returns {*}
       */
      $scope.defaultValue = function(scopePropertyName, defaultValue) {
        var value = $scope[scopePropertyName];
        if (_.isUndefined(value) || _.isNull(value)) {
          $scope[scopePropertyName] = defaultValue;
        }

        return $scope[scopePropertyName];
      };

      /**
       * Only does an $apply if a $digest is not already in progress
       *
       * @param fn
       */
      $scope.safeApply = function(fn) {
        var phase = $rootScope.$$phase;
        if (phase === '$apply' || phase === '$digest') {
          if (fn && (typeof(fn) === 'function')) {
            fn();
          }
        } else {
          this.$apply(fn);
        }
      };

      /**
       * Create a function that will be run inside of a safeApplied method.
       *
       * @param method
       * @param context
       * @returns {Function}
       */
      $scope.bindToSafeApply = function bindToSafeApply(method, context) {
        context = context || this;

        if (method) {
          // Return the method to be wrapped in a $rootScope.safeApply
          return function() {
            var args = arguments;
            $scope.safeApply(function() { method.apply(context, args); });
          };
        }

        return function() {};
      };

      $scope.digestInProgress = function() {
        var phase = $rootScope.$$phase;
        return (phase === '$apply' || phase === '$digest');
      };

//      $scope.$on('$destroy', function() {
//        //we need to destroy the state machine (remove its timeouts)
//      });

      /**
       * Creates a new stateMachine for this component.
       * Calls onStateCompleteCallback(stateMachine) on completion
       *
       * @public
       * @method setState
       * @for HtComponent
       * @param cfg
       * @param onStateCompleteCallback   Callback function(e.g. function(stateMachine) {} )
       *
       * @async
       */
      controller.setState = function(cfg, onStateCompleteCallback) {
        //create noop callback if needed
        onStateCompleteCallback = onStateCompleteCallback || function() {};

        var fsm = $scope.stateMachine;

        if (cfg) {
          var cfgInitialState = cfg.initial;

          //check if there is an initialState attr on the component
          var attrInitialState;
          if ($attrs) {
            var attrState = $attrs.initialState;
            //console.log('initialStateAttr:' + initialStateAttr);
            if (attrState && StateMachineService.hasState(cfg, attrState)) {
              attrInitialState = attrState;
            }
          }

          var initialState = attrInitialState || cfgInitialState;
          //console.log('initialState:' + initialState);

          cfg.initial = initialState;

          fsm = $scope.stateMachine = StateMachineService.create(cfg);
        }

        //callback
        onStateCompleteCallback(fsm);
      };

      /**
       * Retrieves a value from this component's persistent storage
       *
       * @param key
       * @param defaultValue    The value to return if the @key is not found
       * @returns {*}
       */
      controller.getPersistentValue = function(key, defaultValue) {
        return AppStateService.getPersistentValue(componentName, key, defaultValue);
      };

      /**
       * Stores @key:@value for this component
       *
       * @param keyValueHash
       * @returns {*}
       */
      controller.setPersistentValue = function(key, value) {
        return AppStateService.setPersistentValue(componentName, key, value);
      };

      /**
       * Stores @keyValueHash properties for this component
       *
       * @param keyValueHash
       * @returns {*}
       */
      controller.setPersistentValues = function(keyValueHash) {
        return AppStateService.setPersistentValues(componentName, keyValueHash);
      };

      /**
       * Sets a $watch on $scope.key and will automatically persist it on any changes
       *
       * @param {string} key    A key to a value on $scope. Must be a string
       * @param defaultValue    The value to use if no previous value is set for @key
       */
      controller.watchAndPersist = function(key, defaultValue) {
        //Add watch to key value
        $scope.$watch(key, function(newValue) {
          controller.setPersistentValue(key, newValue);
        });

        defaultValue = controller.getPersistentValue(key, defaultValue);

        $scope[key] = defaultValue;
      };

      /**
       * Sets a $watch that will automatically be removed when the $scope is $destroy'ed
       * @param key
       * @param watchHandler
       */
      var autoWatch = function autoWatch(key, watchHandler) {
        //Add watch to key value
        var removeWatch = $scope.$watch(key, watchHandler);

        var removeDestroy = $scope.$on('$destroy', function() {
          removeWatch();
          removeDestroy();
        });
      };

      /**
       * Subscribes to @eventName on @IEventTarget and automatically
       * unsubscribes when the Component is destroyed
       *
       * @param IEventTarget
       * @param eventName
       * @param handler
       */
      var autosubscribe = function autosubscribe(IEventTarget, eventName, handler) {

        IEventTarget.subscribe(eventName, handler);

        var removeDestroy = $scope.$on('$destroy', function() {
          IEventTarget.unsubscribe(eventName, handler);
          removeDestroy();
        });

        //TODO: Maybe add $element.on('$destroy'?
      };

      /**
       * Adds to @handler on @signal and automatically
       * removes when the Component is destroyed
       *
       * @param signal
       * @param handler
       */
      var autoSignalAdd = function autoSignalAdd(signal, handler) {

        signal.add(handler);

        var removeDestroy = $scope.$on('$destroy', function() {
          if (signal.has(handler)) {
            signal.remove(handler);
          }
          removeDestroy();
        });
      };

      /**
       * Adds to @handler $on @eventName and automatically
       * removes when the Component is destroyed
       *
       * @param signal
       * @param handler
       */
      var autoScopeOn = function autoScopeOn(eventName, handler) {

        var removeOnHandler = $scope.$on(eventName, handler);

        var removeDestroy = $scope.$on('$destroy', function() {
          removeOnHandler();
          removeDestroy();
        });
      };

      //Deprecated functions
      var depAutoSubscribe = new DeprecatedFunction(autosubscribe, this, 'controller.autosubscribe', 'controller.auto.subscribe');
      controller.autosubscribe = depAutoSubscribe.getFunction();

      var depAutoAdd = new DeprecatedFunction(autoSignalAdd, this, 'controller.autoadd', 'controller.auto.add');
      controller.autoadd = depAutoAdd.getFunction();

      var depAutoWatch = new DeprecatedFunction(autoWatch, this, 'controller.autoWatch', 'controller.auto.watch');
      controller.autoWatch = depAutoWatch.getFunction();

      //Expose all auto functions on single controller "auto" subobject
      controller.auto = {
        add: autoSignalAdd,
        subscribe: autosubscribe,
        watch: autoWatch,
        on: autoScopeOn
      };

      //Deprecated: Add $element sugar methods
      ElementHelperService.addElementSupport(controller, $scope, $element);

      /**
       * Adds $element.auto.on() and $element.auto.applyOn()
       */
      ElementHelperService.addAutoMethods($element, $scope, controller);

      //Add prerender support
      ComponentPrerenderService.addPrerenderMethods($scope, controller);
    };

    // Service Object Definition
    var service = {
      init: init
    };

    return service;
  }]
);
;/**
 * ComponentLoader Service
 *
 * @class ComponentLoaderService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ComponentLoaderService',
  ['ResourceLoaderService', '$q', '$http', '$compile', '$rootScope', function(ResourceLoaderService, $q, $http, $compile, $rootScope) {
    var config = angular.wilson.config;

    var componentVersion = config.app.version || 'none';
    //console.log('app.version', angular.wilson.config.app.version);
    //console.log('componentVersion', componentVersion);
    var connectionFilters = config.app.connectionFilters || [];

    var tmp = config.app.updateInterval.split(' ');
    var updateInterval = {
      count: tmp[0],
      unit: tmp[1]
    };

    var hostUrl = '';

    //Set the CDN host for loading components
    var cdnConfig = config.cdn;
    if (cdnConfig && cdnConfig.host && cdnConfig.host !== 'false') {
      hostUrl = cdnConfig.protocol + '://' + cdnConfig.host;
      ResourceLoaderService.setResourceHost(hostUrl);
    }

    /**
     * Object cache for components that have already been loaded.
     *
     * @property loadedComponents
     * @type Object
     */
    var loadedComponents = {};

    var lastUpdateCheck = moment();

    /**
     * Attempts to get the app version from the server
     *
     * @param componentName
     * @returns { version: '1.X.X' }
     */
    var getCurrentAppVersion = function() {
      var deferred = $q.defer();

      var versionPath = config.client.app.mountpath + '/version';

      $http.get(versionPath).success(deferred.resolve).error(deferred.reject);

      return deferred.promise;
    };

    /**
     * Attempts to get the @componentName component from the server
     *
     * @param componentName
     * @returns {dependencyInfo}
     */
    var getComponent = function(componentName) {
      var deferred = $q.defer();

      var componentPath = _.str.sprintf('%s/%s/component/%s', config.app.mountpath, componentVersion, componentName);
      componentPath = angular.wilson.utils.path.join(hostUrl, componentPath);

      //append connection filters
      if (connectionFilters) {
        componentPath += _.str.sprintf('/%s', connectionFilters);
      }

      // IR debug info
      //console.log('IR.componentPath', componentPath);

      $http.get(componentPath).success(function(response) {
        // IR debug info
        //console.log('IR.componentPath.response', response);

        //update last check time
        lastUpdateCheck = moment();

        deferred.resolve(response);
      }).error(deferred.reject);

      return deferred.promise;
    };

    /**
     * Loads a component into the view.
     *
     * @private
     * @method loadComponent
     * @param componentName
     */
    var loadComponent = function(componentName) {
      var deferred = $q.defer();

      var cachedData = loadedComponents[componentName];

      // IR debug info
      //console.log('IR.loadComponent.componentName', componentName);
      //console.log('IR.loadComponent.cachedData', cachedData);

      if (!cachedData) {
        getComponent(componentName).then(
          function(dependencyData) {
            // IR debug info
            //console.log('IR.loadBundle.dependencyData', dependencyData);
            if (componentVersion === dependencyData.version) {
              // Load Component Resources
              ResourceLoaderService.loadBundle(dependencyData,
                function() {
                  //cache the component data
                  loadedComponents[componentName] = dependencyData;
                  deferred.resolve(dependencyData);
                },
                function() {
                  deferred.reject({
                    message: 'Failed to load resources for ' + componentName
                  });
                });
            } else {
              deferred.resolve(dependencyData);
            }
          },
          deferred.reject
        );
      } else {
        //component is already loaded
        if (moment().diff(lastUpdateCheck, updateInterval.unit) > updateInterval.count) {
          //console.log('updateInterval has expired! interval', updateInterval);
          //We havent checked the server version in a while, make sure we are up to date
          getCurrentAppVersion().then(
            function(versionInfo) {
              if (versionInfo.version !== componentVersion) {
                // IR debug info
//                console.log('IR.componentVersion', componentVersion);
//                console.log('IR.componentVersion typeof', typeof componentVersion);
//                console.log('IR.versionInfo.version', versionInfo.version);
//                console.log('IR.versionInfo.version typeof', typeof versionInfo.version);

                //The server application is a different version than the client
                //mark as out-of-date
                deferred.resolve({
                  version: 'out-of-date'
                });
              } else {
                //Client is still the same version as the server
                //update last check time
                lastUpdateCheck = moment();
                //return cached component
                deferred.resolve(cachedData);
              }
            },
            deferred.reject
          );
        } else {
          //return cached component
          deferred.resolve(cachedData);
        }
      }

      return deferred.promise;
    };

    // Service Object
    var service = {
      load: loadComponent
    };

    return service;
  }]
);
;/**
 * Prerender support module for Wilson
 *
 * @class ComponentPrerenderService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.prerender', []).provider('ComponentPrerenderService', ['$compileProvider', function($compileProvider) {

  //Mark prerender as incomplete
  window.prerenderReady = false;

  function prerenderLog(message) {
    var prerenderConfig = angular.wilson.config.prerender;
    if (prerenderConfig && prerenderConfig.enableLogs) {
      console.log(message);
    }
  }

  /**
   * Registers additional ngRepeat directive to track rendering status
   */
  function registerPrerenderNgRepeat() {
    $compileProvider.directive('ngRepeat', ['$timeout', function($timeout) {
      /**
       * Returns the property that ngRepeat is iterating on
       *
       * @param scope
       * @returns {undefined}
       */
      function getNgRepeatValue(scope) {
        var prop = undefined;

        for(var key in scope) {
          if (!(key === 'this' || _.str.startsWith(key, '$'))) {
            prop = {};
            prop[key] = scope[key];
            break;
          }
        };

        return prop;
      }

      /**
       * Additional ngRepeat directive to track when the ngRepeat
       * has finished populating the view
       */
      return {
        restrict: 'A',
        priority: -1,
        require: ['?ngRepeat', '^?WilsonComponent'],
        link: function($scope, $element, $attrs, ctrls) {
          //only do this is rendering has not completed
          if (!window.prerenderReady) {
            var controller = ctrls[0];
            var cmpCtrl = ctrls[1];

            if ($scope.$first) {
              cmpCtrl.registerViewDependency();
            }

            if ($scope.$last) { // all are rendered
              cmpCtrl.defferedResolveViewDependency();
            }
          }
        }
      };
    }]);
  }

  /**
   * Returns the ComponentPrerenderService
   *
   * @public
   * @method $get
   */

  this.$get = ['$timeout', function($timeout) {
    /**
     * Adds functions needed for Prerender functionality
     *
     * @param $scope
     * @param controller
     */
    function addPrerenderMethods($scope, controller) {
      var viewDepCount = 0;
      var pendingResolveDepCount = 0;

      /**
       * Registers a new child view dependency for this component
       * @type {Function}
       */
      function registerViewDependency() {
        viewDepCount++;

        //console.log(_.str.sprintf('Added dep to %s. Count: %d', componentName, viewDepCount));
      };

      /**
       * Immediately marks @count child view dependencies as resolved
       * @type {Function}
       */
      function resolveViewDependency(count) {
        count = count || 1;

        if (viewDepCount >= count) {
          viewDepCount -= count;
        } else {
          prerenderLog('ERROR: Attempt to resolve more view deps than were added');
        }


        if (viewDepCount === 0) {
          prerenderLog('All view dependencies have resolved for component ' + $scope.componentCName);
          $scope.renderComplete = true;

          if ($scope.parentComponent && $scope.parentComponent.componentCName) {
            $scope.parentComponent.resolveViewDependency();
          } else {
            prerenderLog('PRERENDER COMPLETE!!!');
            window.prerenderReady = true;
          }
        }
      };

      /**
       * Marks a child view dependencies as resolved but deffers the resolution to allow for $digest() and render cycles to complete
       *
       * @type {Function}
       */
      function defferedResolveViewDependency() {
        if (pendingResolveDepCount < 1) {
          pendingResolveDepCount++;
          $timeout(function () {
            $timeout(function () {
              controller.resolveViewDependency(pendingResolveDepCount);
              pendingResolveDepCount = 0;
            }, 0);
          }, 0);
        } else {
          pendingResolveDepCount++;
        }
      };

      /**
       * Adds a (deffered) check to see if all view dependencies have been resolved for this component
       *
       * @type {Function}
       */
      function checkViewDependencies() {
        $timeout(function () {
          $timeout(function () {
            //console.log(_.str.sprintf('Checking deps for [%s](1)', $scope.componentCName));
            if (viewDepCount === 0 && $scope.parentComponent && $scope.parentComponent.componentCName) {
              //console.log(_.str.sprintf('All deps resolved for [%s](1)', $scope.componentCName));
              $scope.parentComponent.resolveViewDependency();
            }
          }, 0);
        }, 0);
      };

      /**
       * Register a data dependency that must be resolved before the view can render fully
       *
       * @param key             The $scope key for the data dependency (Ex: to track $scope.myValue => registerDataDependency('myValue'))
       * @param validationFunc  A function that returns true when the data is considered valid. Defaults to !_.isEmpty(value)
       */
      function registerDataDependency(key, validationFunc) {
        //console.log(_.str.sprintf('Registering data dep: %s.%s', $scope.componentCName, key));
        //register view dependency
        controller.registerViewDependency();

        //default validation function to !_.isEmpty()
        if (!validationFunc) {
          validationFunc = function (value) {
            return !_.isEmpty(value);
          }
        }

        //Add watch to key value
        var removeWatch = $scope.$watch(key, function (newValue) {
          if (validationFunc(newValue)) {
            removeWatch();
            //console.log(_.str.sprintf('Resolved data dep: %s.%s', $scope.componentCName, key));
            controller.defferedResolveViewDependency();
          }
        });
      };

      //Component prerender functions
      var prerenderFunctions = {
        registerViewDependency: registerViewDependency,
        registerDataDependency: registerDataDependency,
        checkViewDependencies: checkViewDependencies,
        resolveViewDependency: resolveViewDependency,
        defferedResolveViewDependency: defferedResolveViewDependency
      };

      //Add prerender functions to the $scope and controller
      _.merge($scope, prerenderFunctions);
      _.merge(controller, prerenderFunctions);

    }

    function deregisterPrerenderNgRepeat() {
      //TODO: Figure out how to remove the extra ngRepeat directive
      //var ngRepeat = $injector.get('ngRepeat');
      //console.log('ngRepeat', ngRepeat);
      //var ngRepeat = $injector.get('ngRepeat');
      //console.log('ngRepeat', ngRepeat);
      //$provide.value('ngRepeat', []);
    }


    //Add additional ngRepeat directive for render tracking
    registerPrerenderNgRepeat();

    // Service Object Definition
    var service = {
      addPrerenderMethods: addPrerenderMethods,
      deregisterPrerenderNgRepeat: deregisterPrerenderNgRepeat
    };

    return service;
  }];
}]);;/**
 * Service to help with function deprecation
 *
 * @class DeprecatedFunctionService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('DeprecatedFunctionService', [function() {
    /**
     * Class to handle function deprecation
     *
     * @param func                  The deprecated function
     * @param funcContext           The context object (thisArg) for the deprecated function
     * @param deprecatedFuncName    The human readable function name of the deprecated function (object.myDeprecatedFunction())
     * @param newFuncName           The human readable function name of the new function (object.myNewFunction())
     * @constructor
     */
    function DeprecatedFunction(func, funcContext, deprecatedFuncName, newFuncName) {
      var _self = this;

      var depFunction = function() {
        console.log(_.str.sprintf('Warning: %s() is deprecated. Use %s() instead', deprecatedFuncName, newFuncName));
        return func.apply(funcContext, _.toArray(arguments))
      };

      /**
       * Returns the prepared deprecated function
       *
       * @returns {Function}
       */
      this.getFunction = function() {
        //return func;
        return depFunction;
      };
    }


    // Service Object Definition
    var service = {
      DeprecatedFunction: DeprecatedFunction
    };

    return service;
  }]
);
;/**
 * Adds convenience methods for easier $element handler management
 *
 * @class ElementHelperService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ElementHelperService', ['DeprecatedFunctionService', function(DeprecatedFunctionService) {
    var DeprecatedFunction = DeprecatedFunctionService.DeprecatedFunction;

    var addElementSupport = function(controller, $scope, $element) {
      /**
       * Adds to @handler on @eventName and automatically removes the handler when the $element is destroyed
       *
       * Note: This does NOT do a $scope.$apply()
       *
       * @param eventName           The name of the DOM event to listen for
       * @param handler             The function to run when the event is fired
       * @param elementToListenOn   (Optional) The element to listen on. If this is null it defaults to $element
       */
      var autoOn = function autoOn(eventName, handler, elementToListenOn) {
        //default elementToListenOn to $element
        if (!elementToListenOn) {
          elementToListenOn = $element;
        }

        //add an event listener
        elementToListenOn.on(eventName, handler);

        //remove the listener automatically when the $element is destroyed
        $element.on('$destroy', function() {
          elementToListenOn.off(eventName, handler);
        });
      };

      var depAutoOn = new DeprecatedFunction(autoOn, this, 'controller.autoOn', '$element.auto.on');
      controller.autoOn = depAutoOn.getFunction();

      /**
       * Adds to @handler on @eventName and automatically removes the handler when the $element is destroyed
       *
       * Note: This automatically does a $scope.$apply()
       *
       * @param eventName           The name of the DOM event to listen for
       * @param handler             The function to run when the event is fired
       * @param handlerContext      The context object (this) for the handler. Defaults to 'controller' if null
       * @param elementToListenOn   (Optional) The element to listen on. Defaults to $element if null
       */
      var autoApplyOn = function autoApplyOn(eventName, handler, handlerContext, elementToListenOn) {
        //default elementToListenOn to $element
        if (!elementToListenOn) {
          elementToListenOn = $element;
        }
        //default handlerContext to controller
        if (!handlerContext) {
          handlerContext = controller;
        }

        //add an event listener
        elementToListenOn.on(eventName, function() {
          var eventArgs = _.toArray(arguments);
          $scope.$apply(function() {
            handler.apply(handlerContext, eventArgs);
          });
        });

        //remove the listener automatically when the $element is destroyed
        $element.on('$destroy', function() {
          elementToListenOn.off(eventName, handler);
        });
      };

      var depAutoApplyOn = new DeprecatedFunction(autoApplyOn, this, 'controller.autoApplyOn', '$element.auto.applyOn');
      controller.autoApplyOn = depAutoApplyOn.getFunction();
    };

    /**
     * Adds convenience methods to $element:
     * $element.auto.on()
     * $element.auto.applyOn()
     *
     * @param $element
     * @param $scope
     * @param controller
     */
    var addAutoMethods = function($element, $scope, controller) {

      /**
       * Adds to @handler on @eventName and automatically removes the handler when the $element is destroyed
       *
       * Note: This does NOT do a $scope.$apply()
       *
       * @param eventName           The name of the DOM event to listen for
       * @param handler             The function to run when the event is fired
       * @param elementToListenOn   (Optional) The element to listen on. If this is null it defaults to $element
       */
      var autoOn = function autoOn(eventName, handler, elementToListenOn) {
        //default elementToListenOn to $element
        if (!elementToListenOn) {
          elementToListenOn = $element;
        }

        //add an event listener
        elementToListenOn.on(eventName, handler);

        //remove the listener automatically when the $element is destroyed
        $element.on('$destroy', function() {
          elementToListenOn.off(eventName, handler);
        });
      };

      /**
       * Adds to @handler on @eventName and automatically removes the handler when the $element is destroyed
       *
       * Note: This automatically does a $scope.$apply()
       *
       * @param eventName           The name of the DOM event to listen for
       * @param handler             The function to run when the event is fired
       * @param handlerContext      The context object (this) for the handler. Defaults to 'controller' if null
       * @param elementToListenOn   (Optional) The element to listen on. Defaults to $element if null
       */
      var autoApplyOn = function autoApplyOn(eventName, handler, handlerContext, elementToListenOn) {
        //default elementToListenOn to $element
        if (!elementToListenOn) {
          elementToListenOn = $element;
        }
        //default handlerContext to controller
        if (!handlerContext) {
          handlerContext = controller;
        }

        //add an event listener
        elementToListenOn.on(eventName, function() {
          var eventArgs = _.toArray(arguments);
          $scope.$apply(function() {
            handler.apply(handlerContext, eventArgs);
          });
        });

        //remove the listener automatically when the $element is destroyed
        $element.on('$destroy', function() {
          elementToListenOn.off(eventName, handler);
        });
      };

      //Add subobject to element
      $element.auto = {
        on: autoOn,
        applyOn: autoApplyOn
      };
    };


    // Service Object Definition
    var service = {
      addElementSupport: addElementSupport,
      addAutoMethods: addAutoMethods
    };

    return service;
  }]
);
;/**
 * ParserFactory Service
 *
 * @class ParserFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ParserFactoryService', ['$injector', function($injector) {
  /**
   * Create an new parser service instance
   *
   * @public
   * @method create
   * @param parseMethod
   * @param serializeMethod
   *
   * @returns {function} - new parser service instance
   */
  var create = function(parseMethod, serializeMethod) {

    if (typeof parseMethod !== 'function') {
      throw new Error('Error creating parser. Param parseMethod is not a function!');
    }

    // Optional SerializeMethod implementation
    if (typeof serializeMethod !== 'function') {
      serializeMethod = function(data) { return data; };
    }

    // Return the new parser
    return function() {
      var instanceParse = parseMethod;
      var instanceSerialize = serializeMethod;
      var _self = this;

      this.parse = function(data) {
        var args = _.toArray(arguments);
        args.unshift($injector);
        return instanceParse.call(_self, args);
      };

      this.serialize = function(data) {
        var args = _.toArray(arguments);
        args.unshift($injector);
        return instanceSerialize.apply(_self, args);
      };

      /**
       * Embellishes data
       *
       * @param data
       * @param ...         Rest args for any additional parameters you need to pass in
       */
      this.embellish = function(data) {
        //var args = Array.prototype.slice.call(arguments);
        var args = _.toArray(arguments);
        args.unshift($injector);
        var parsedData = instanceParse.apply(_self, args);
        return angular.wilson.embellishModel(data, parsedData);
      };

      /**
       * Embellishes a collection of items
       *
       * @param collection
       * @param ...         Rest args for any additional parameters you need to pass in
       */
      this.embellishCollection = function(collection) {
        //get the current arguments and remove the first param (the collection)
        var args = Array.prototype.slice.call(arguments);
        args.shift();

        //embellish each item in the collection
        _.each(collection, function(data, key) {
          //append the current collection data to the arguments
          args.unshift(data);
          //embellish the current collection item
          collection[key] = _self.embellish.apply(_self, args);
          //remove the current collection data from the arguments
          args.shift();
        });
      };
    };
  };

  // Service Object
  var service = {
    create: create
  };

  return service;
}]);
;/**
 * This service is used to dynamically load new scripts into the DOM and fire a callback on completion. Scripts
 * may be loaded either one at a time or by batch using the loadBundle() method. Loaded scripts are cached and will
 * not be subsequently loaded if they are already in the cache. The cache entry for a given script is provisioned with
 * a value of false while the script is a loading and is then transitioned to a value of true once the script is fully
 * loaded.
 *
 * @class ResourceLoaderService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ResourceLoaderService',
  ['$templateCache', function($templateCache) {
    var scripts = {};
    var templates = {};
    var hostUrl = '';

    // We are handling our own caching so set jQuery cache to true
    // Note: This is very important because otherwise ALL requests
    // will re-hit the server
    $.ajaxSetup({
      cache: true
    });

    /**
     * Set a URL to use as the base URL to load resources from
     * @param host
     */
    var setResourceHost = function(host) {
      hostUrl = host;
    };

    /**
     *
     * Loads a script for the given source url and calls the passed callback upon completion.
     *
     * @public
     * @method loadScript
     * @param src
     * @param callback
     *
     * @async
     */
    var loadScript = function(src, callback) {
      callback = callback || $.noop;

      var scriptUrl = angular.wilson.utils.path.join(hostUrl, src);
      if (!scripts[src]) {
        scripts[src] = false;

        //console.log('resource', scriptUrl);
        $.getScript(scriptUrl)
          .done(function( script, textStatus ) {
            scripts[src] = true;
            //console.log(_.str.sprintf('SUCCESS: %s LOADED (%s)', src, textStatus));
            callback();
          })
          .fail(function( jqxhr, settings, exception ) {
            console.log(_.str.sprintf('ERROR: %s FAILED TO LOAD', src));
            callback(false);
          });
      } else {
        callback();
      }
    };

    /**
     *
     * Loads a template given an @id, @type, and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request. Returns true if the template was loaded, false if the template
     * already exists in the cache.
     *
     * @public
     * @method loadTemplate
     *
     * @param id
     * @param type
     * @param data
     *
     * @returns boolean - true if template was added, false if it is already cached.
     */
    var loadTemplate = function(id, type, data) {
      // If the template is not cached, then load it
      if (!templates[id]) {
        templates[id] = true;

        // Register this template id into Angular template cache
        $templateCache.put(id, data);

        return true;
      }

      return false;
    };

    /**
     *
     * Loads a resource bundle of scripts and templates. Once all files have been loaded the given @callback
     * is fired. Template files are first loaded synchronously and sourced scripts are then loaded asynchronously. If
     * no new scripts or templates are found (i.e. if all scripts and templates already exist in the cache), then the
     * callback is immediately fired.
     *
     * @public
     * @method loadBundle
     * @param resources
     * @param callback
     *
     * @async
     */
    var loadBundle = function(resources, bundleCompleteCallback, bundleErrorCallback) {
      bundleCompleteCallback = bundleCompleteCallback || $.noop;

      // Determine the delta between scripts in the cache and new scripts in the given resource bundle
      var newScripts    = _.difference(resources.scripts, _.keys(scripts));
      var newTemplates  = _.difference(_.pluck(resources.templates, 'id'), _.keys(templates));

      // Create bit string  -- TODO: add version checksum aggregation here
//      var missingScripts = [];
//      var anyLoaded = false;
//      _.each(resources.scripts, function(value, key) {
//        if (!scripts[value]) {
//          missingScripts.push(key);
//        } else {
//          anyLoaded = true;
//        }
//      });
//
//      if (anyLoaded) {
//        console.log(missingScripts.join(','));
//      } else {
//        console.log('ALL SCRIPTS NEEDED');
//      }

      // Load any and all new templates
      _.each(newTemplates, function(templateId) {
        var template = _.findWhere(resources.templates, { id: templateId });
        loadTemplate(template.id, template.type, template.data);
      });

      // Load all of the new scripts in parallel
      async.each(newScripts, function(script, callback) {
        loadScript(script, callback);
      }, function(err) {
        if (err) {
          bundleErrorCallback();
        } else {
          //This is the callback when all scripts have loaded
          bundleCompleteCallback();
        }
      });
    };

    // Service Object
    var service = {
      setResourceHost: setResourceHost,

      loadScript: loadScript,

      loadTemplate: loadTemplate,

      loadBundle: loadBundle
    };

    return service;
  }]
);
;/**
 * A service extension of HtStateMachine that works with AngularJS. Use this service
 * if you need Angular data-binding to update automatically on state changes.
 *
 * @class StateMachineService
 * @extends HtStateMachine
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('StateMachineService',
  ['$timeout', function($timeout) {

    /**
     *
     * @param cfg
     * @param target
     * @returns {*}
     */
    var create = function(cfg, target) {
      //For Angular UI to update correctly on timed events
      //we need to us the $timeout service
      _.extend(cfg, {
        setTimeout: $timeout,
        clearTimeout: $timeout.cancel
      });

      return  HtStateMachine.create(cfg, target);
    };

    // Extend the HtStateMachine to create the service
    var service = _.extend({}, HtStateMachine);
    service.create = create;

    return service;
  }]

);
;/**
 * TranslationOverride Service
 *
 * @class TranslationOverrideService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('TranslationOverrideService', function() {

  //Global Dictionary of override translations for fast lookup
  var translationOverrides = {
    // 'overriddenNS': {
    //   'textKey': {
    //      'overridingNs1': true
    //      ...
    //    },
    //    ...
    // },
    //  ...
  };

  /**
   * Adds an overide entry for the given params
   *
   * @param nsToOverride    The namespace you want to be overriden
   * @param overridingNs    The namespace you want to override with
   * @param textKey         The textKey to override
   */
  var addOverride = function(nsToOverride, overridingNs, textKey) {
    var nsOverrides = translationOverrides[nsToOverride];

    if (!nsOverrides) {
      //create a dictionary for 'nsToOverride'
      nsOverrides = translationOverrides[nsToOverride] = {};
    }

    var textKeyEntry = nsOverrides[textKey];
    if (!textKeyEntry) {
      //create and entry for the 'textKey' in 'nsToOverride'
      textKeyEntry = nsOverrides[textKey] = {};
    }

    var overridingNsEntry = textKeyEntry[overridingNs];
    if (!overridingNsEntry) {
      //mark the textKey as having an override for 'overridingNs'
      textKeyEntry[overridingNs] = true;
    }

    //console.log('translationOverrides', translationOverrides);
  };

  /**
   * Returns true if namespace @ns has ANY overrides for @textKey
   *
   * @param ns
   * @param textKey
   * @returns {boolean}
   */
  var hasOverride = function(ns, textKey) {
    return (translationOverrides[ns] && translationOverrides[ns][textKey]);
  };

  /**
   * Returns true if namespace @ns has an override for @textKey in @overridingNs
   *
   * @param ns
   * @param textKey
   * @param overridingNs
   * @returns {boolean}
   */
  var hasOverrideForNamespace = function(ns, textKey, overridingNs) {
    return (translationOverrides[ns] &&
            translationOverrides[ns][textKey] &&
            translationOverrides[ns][textKey][overridingNs]);
  };

  // Service Object
  var service = {
    addOverride: addOverride,
    hasOverride: hasOverride,
    hasOverrideForNamespace: hasOverrideForNamespace
  };

  return service;
});
;/**
 * This service provides i18n translation of dynamic client side strings.
 *
 * @class i18nextService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author dan.nguyen
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.module('wilson.i18n', []).provider('i18nextService', function() {
  var options = {};

  /**
   * Initialize the i18nextServiceProvider with a set of options.
   *
   * @public
   * @method init
   * @param o
   */
  this.init = function(o) {
    options = _.extend(options, o);

    window.i18n.init(options);
  };

  var getTranslateForNamespace = function(namespace) {
    //Return a function that has a default namespace
    return function(text, options) {
      //create a default callback if needed
      options = options || {};

      // default namespace is component name
      if (typeof options.ns !== 'string' || options.ns === '') {
        options.ns = namespace;
      }

      //use the i18n provider to translate the text
      return window.i18n.t(text, options);
    };
  };

  function traverseRecursive(value, key, list, handler) {
    if (_.isObject(value) || _.isArray(value)) {
      _.each(value, function(v, k, l) {
        l[k] = traverseRecursive(v, k, l, handler);
      });
      return list[key];
    } else {
      // jsonOb is a number or string
      return handler(value, key, list);
    }
  }

  function traverse(object, handler) {
    //set default handler to an identity function
    handler = handler || _.identity;

    if (_.isObject(object) || _.isArray(object)) {
      _.each(object, function(value, key, list) {
        list[key] = traverseRecursive(value, key, list, handler);
      });
      return object;
    } else {
      // jsonOb is a number or string
      return handler(object);
    }
  }

  var getTranslateJsonForNamespace = function(namespace) {
    var translate = getTranslateForNamespace(namespace);

    //Return a function that has a default namespace
    return function(jsonObj, options) {
      options = options || {};
      options.ignoreKeys = options.ignoreKeys || [];

      return traverse(jsonObj, function(value, key, list) {
        var newValue = value;
        if (_.isString(value) && !_.contains(options.ignoreKeys, key)) {
          newValue = translate(value, options);
        }
        return newValue;
      });
    };
  };

  /**
   * Returns the translate method of the i18nextService
   *
   * @public
   * @method $get
   */

  this.$get = ['$window', function($window) {
    return {
      translate: $window.i18n.t,

      getTranslateForNamespace: getTranslateForNamespace,

      getTranslatorForNamespace: function(namespace) {
        var translator = {
          translate: getTranslateForNamespace(namespace),
          translateJson: getTranslateJsonForNamespace(namespace)
        };

        return translator;
      },

      getSupportedLanguages: function() {
        return options.languageData ? options.languageData : [];
      },

      getActiveLanguage: function() {
        return options.lng ? options.lng : options.fallbackLng;
      }
    };
  }];

});
;/**
 * A extension of javascript-state-machine's StateMachine
 *
 * Added features:
 *  - States can automatically timeout via @cfg.timeouts
 *  - FSM's have a fsm.states that is an array that contains a list of unique states
 *
 * @class HtStateMachine
 * @extends StateMachine
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */

'use strict';

(function(window, _) {

    //Make HtStateMachine an extension of StateMachine
    var HtStateMachine = _.extend({}, StateMachine);

    /**
     * Override StateMachine's create method add custom functionality
     *
     * @public
     * @method create
     * @param cfg
     * @param target
     *
     * @return Object - A New StateMachine.
     */
    HtStateMachine.create = function(cfg, target) {
        var addEvents = false;
        var fsm = null;

        // Removes the default invalid state change errors from the console
        cfg.error = cfg.error || function() { };

        if (!addEvents) {
            addTimeoutCallbacks(cfg);
            fsm = StateMachine.create(cfg, target);
        } else {
            //Warning: This is not working right now
            fsm = createEventStateMachine(cfg, target);
            addTimeoutEventListeners(fsm, cfg);
        }

        fsm.states = HtStateMachine.getStates(cfg);

        //console.log('fsm.states');
        //console.log(fsm.states);

        return fsm;
    };

    /**
     * Modifies StateMachine cfg to support timeouts from cfg.timeouts values
     *
     * e.g.
     * cfg.timeouts: [
     *    {state: 'Opened', duration: 3000, timeoutEvent: 'close', refreshEvent: 'open'}
     * ]
     *
     * @private
     * @method addTimeoutCallbacks
     * @param cfg
     */
    function addTimeoutCallbacks(cfg) {
        //private vars
        var callbacks = cfg.callbacks || {};
        var timeouts = cfg.timeouts || [];
        var _setTimeout = cfg.setTimeout;// || setTimeout;
        var _clearTimeout = cfg.clearTimeout;// || clearTimeout;

        _.each(timeouts, function(timeout) {
            //console.log('addTimeoutCallbacks' + timeout.state);

            var callbackName = 'onenter' + timeout.state;
            callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to) {
                var fsm = this;

                var timeoutCallback = function() {
                    //console.log('Timeout(' + cfg.blah + '):' + to);
                    //console.log(fsm);
                    fsm[timeout.timeoutEvent]();
                };

                _clearTimeout(fsm.curTimeout);
                fsm.curTimeout = _setTimeout(timeoutCallback, timeout.duration);
            });

            //Add LEAVE STATE callback to set timeout
            callbackName = 'onleave' + timeout.state;
            callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function() {
                var fsm = this;
                _clearTimeout(fsm.curTimeout);
            });

            if (timeout.refreshEvent) {
                //Add REFRESH EVENT callbacks
                callbackName = 'onbefore' + timeout.refreshEvent;
                callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to, args) {
                    if (from === timeout.state) {
                        //console.log('Reset Callback called for:' + callbackName + ' from:' + from + ' to:' + to);
                        var fsm = this;

                        fsm['onenter' + timeout.state](name, from, to, args);
                    }
                });
            }
        });

        cfg.callbacks = callbacks;
    }

    /**
     * Returns a StateMachine callback function that first runs newCallback
     * and then calls the preexiting callback (if there is one)
     *
     * @public
     * @method prependCallback
     * @param callbacks         The callbacks object
     * @param callbackName      The callback name to prepend to
     * @param newCallback       The new callback function
     *
     * @returns Function - The merged callback
     */
    HtStateMachine.preprendCallback = function(callbacks, callbackName, newCallback) {
        var origCallback = callbacks[callbackName];

        var mergedCallback = function(name, from, to, args) {
            var fsm = this;

            //call new callback
            newCallback.apply(fsm, [name, from, to, args]);

            //call original callback
            if (origCallback) {
                origCallback.apply(fsm, [name, from, to, args]);
            }
        };

        return mergedCallback;
    };

    /**
     * Returns an unique array of all States in the given config.
     *
     * @public
     * @method getStates
     * @param cfg
     */
    HtStateMachine.getStates = function(cfg) {
        var states = [];
        var events = cfg.events || [];

        function appendStates(stateArray) {
            if (!_.isArray(stateArray)) {
                stateArray = [stateArray];
            }
            states = states.concat(stateArray);
        }

        //Add all states from the events collection
        _.each(events, function(event) {
            appendStates(event.to);
            appendStates(event.from);
        });

        //make the list unique
        states = _.uniq(states);

        return states;
    };

    /**
     * Returns true if stateName exists in the config.
     *
     * @public
     * @method hasState
     * @param cfg
     * @param stateName
     *
     * @return boolean - true if stateName exists.
     */
    HtStateMachine.hasState = function(cfg, stateName) {
        var states = HtStateMachine.getStates(cfg);
        if (_.indexOf(states, stateName) >= 0) {
            return true;
        }
        return false;
    };

    /**
     * WARNING: This is NOT WORKING. Fix before using.
     *
     * Given a @cfg returns a new StateMachine that will dispatch events for all
     * generic 'events' ('onbeforeevent', 'onleavestate', 'onenterstate', 'onafterevent')
     *
     * Events follow the EventTarget.js interface (on, off, trigger)
     *
     * @private
     * @method createEventStateMachine
     * @param cfg
     * @param target
     *
     * @returns Object - Event based StateMachine object.
     */
    function createEventStateMachine(cfg, target) {
        var callbacks = cfg.callbacks || {};
        var eventCallbacks = {};

        var eventDispatcher = new EventTarget();
        //Create events for all General callbacks
        var eventCallbackNames = ['onbeforeevent', 'onleavestate', 'onenterstate', 'onafterevent'];
        _.each(eventCallbackNames, function(callbackName) {

            (function(origCallback) {
                //change the original callbacks to use events
                if (origCallback) {
                    eventDispatcher.on(callbackName, function(event) {
                        origCallback(event.name, event.from, event.to, event.args);
                    });
                }
            })(callbacks[callbackName]);

            //create a callback that dispatches an event
            eventCallbacks[callbackName] = function(name, from, to, args) {
                //console.log('Event Callback (' + name + '): ' + callbackName);
                eventDispatcher.trigger({   type: callbackName,
                    name: name,
                    from: from,
                    to: to,
                    args: args
                });
            };

            callbacks[callbackName] = eventCallbacks[callbackName];
        });


        //Create StateMachine and add events to it
        var fsm = StateMachine.create(cfg, target);
        fsm = _.extend(eventDispatcher, fsm);

        return fsm;
    }

    /**
     * WARNING: This is dependant on createEventStateMachine() which is currently broken
     *
     * Adds timeout listers to a Event Statemachine created by createEventStateMachine()
     *
     * @private
     * @method addTimeoutEventListeners
     * @param fsm
     * @param cfg
     */
    function addTimeoutEventListeners(fsm, cfg) {
        //This is the timeout id or promise
        var curTimeout;

        var timeouts = cfg.timeouts || [];
        var _setTimeout = cfg.setTimeout || setTimeout;
        var _clearTimeout = cfg.clearTimeout || clearTimeout;

        //add timeout listeners
        fsm.on('onenterstate', function(event) {
            var timeout = _.findWhere(timeouts, {state: event.to});
            if (timeout) {
                console.log('Timeout found for:' + event.to);
                curTimeout = _setTimeout(function() {
                                console.log('Timeout:' + event.to);
                                fsm[timeout.timeoutEvent]();
                            }, timeout.duration);
            }
        });

        fsm.on('onleavestate', function() {
            _clearTimeout(curTimeout);
        });
    }

    //Set Global instance var
    window.HtStateMachine = HtStateMachine;

})(this, _);
;/**
 * Data specific utilities
 *
 * @class DataUtils
 *
 */
'use strict';

(function(wilson, _) {

  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start Start index
   * @param replace Number of elements to remove
   * @param arrayToSplice Optional array to append
   */
  var spliceArray = function(origArray, start, replace, arrayToSplice) {
    var args = [start, replace];
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    Array.prototype.splice.apply(origArray, args);
  };

  /**
   * Replaces the contents of @origArray with the contents of @newArray
   * @param origArray
   * @param newArray
   */
  var replaceArray = function(origArray, newArray) {
    spliceArray(origArray, 0, origArray.length, newArray);
  };

  /**
   * Replaces the contents of @origArray with the contents of @newArray
   * @param origArray
   * @param newArray
   */
  var clearArray = function(origArray) {
    spliceArray(origArray, 0, origArray.length);
  };

  wilson.utils.spliceArray = spliceArray;
  wilson.utils.replaceArray = replaceArray;
  wilson.utils.clearArray = clearArray;
})(angular.wilson, _);;/**
 * Data specific utilities
 *
 * @class DataUtils
 *
 */
'use strict';

(function(wilson, _) {
  var SIZE_UNITS = [' Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var LOG_1024 = Math.log(1024);

  /**
   * Given a number of bytes returns a well formatted size with units
   *
   * @param bytes
   * @returns {string}
   */
  wilson.utils.bytesToReadable = function(bytes, decimalPoint) {
    decimalPoint = _.isNumber(decimalPoint) ? decimalPoint : 1;

    // Make Sure we have a number!
    bytes = parseInt(bytes, 10);

    if (bytes === 0) {
      //This is has no size return
      return '0 Bytes';
    } else {
      //Determine the factor of KB's
      var kbFactor = parseInt(Math.floor(Math.log(bytes) / LOG_1024), 10);

      //convert bytes to the new unit
      var size = bytes / Math.pow(1024, kbFactor);

      //convert the size to formatted string
      var sizeText = (kbFactor === 0) ? size.toString() : size.toFixed(decimalPoint);

      //remove any trailing zeroes
      sizeText = sizeText.replace(/\.0+$/, '');

      //return the final string
      return sizeText + ' ' + SIZE_UNITS[kbFactor];
    }
  };

  /**
   * This is a function that defines the sort order and it wlll be used with sort()
   * Given a props returns a sorted object
   */
  wilson.utils.getMultipleColumnSort = function(props) {
    return function(a,b) {
      return _.reduce(props,function(r,v) {
        if (r === 0 && a && b) {
          switch (true) {
            case  a[v] > b[v]:
              return 1;
            case a[v] < b[v]:
              return -1;
            case a[v] === b[v]:
              return 0;
          }
        }
        return r;
      },0);
    };
  };

  /**
   * This function returns a RFC4122 v4 compliant UUID string.
   */
  /*jslint bitwise: true */
  wilson.utils.generateUUID = function() {
    var d = (new Date()).getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
  };
  /*jslint bitwise: false */
})(angular.wilson, _);
;/**
 * Error Utils
 *
 * @class ErrorUtils
 *
 * Author: hunter.novak
 * Date: 2/11/2014
 */
'use strict';

(function(wilson, _) {

  // return platform error code for the response
  wilson.utils.printStackTrace = function() {
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
    console.log(stack);
  };

})(angular.wilson, _);
;/**
 * KeyCode constants
 * @class KeyCodes
 *
 * Author: justin.fiedler
 * Date: 9/16/13
 */
'use strict';

(function(wilson) {
  wilson.utils.keyCodes = {
    KEY_CANCEL: 3,
    KEY_HELP: 6,
    KEY_BACK_SPACE: 8,
    KEY_TAB: 9,
    KEY_CLEAR: 12,
    KEY_RETURN: 13,
    KEY_ENTER: 14,
    KEY_SHIFT: 16,
    KEY_CONTROL: 17,
    KEY_ALT: 18,
    KEY_PAUSE: 19,
    KEY_CAPS_LOCK: 20,
    KEY_ESCAPE: 27,
    KEY_SPACE: 32,
    KEY_PAGE_UP: 33,
    KEY_PAGE_DOWN: 34,
    KEY_END: 35,
    KEY_HOME: 36,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_PRINTSCREEN: 44,
    KEY_INSERT: 45,
    KEY_DELETE: 46,
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_SEMICOLON: 186,   //this is for chrome/ie
    KEY_SEMICOLON_FF: 59, //this is for firefox
    KEY_EQUALS: 61,
    KEY_A: 65,
    KEY_B: 66,
    KEY_C: 67,
    KEY_D: 68,
    KEY_E: 69,
    KEY_F: 70,
    KEY_G: 71,
    KEY_H: 72,
    KEY_I: 73,
    KEY_J: 74,
    KEY_K: 75,
    KEY_L: 76,
    KEY_M: 77,
    KEY_N: 78,
    KEY_O: 79,
    KEY_P: 80,
    KEY_Q: 81,
    KEY_R: 82,
    KEY_S: 83,
    KEY_T: 84,
    KEY_U: 85,
    KEY_V: 86,
    KEY_W: 87,
    KEY_X: 88,
    KEY_Y: 89,
    KEY_Z: 90,
    KEY_CONTEXT_MENU: 93,
    KEY_NUMPAD0: 96,
    KEY_NUMPAD1: 97,
    KEY_NUMPAD2: 98,
    KEY_NUMPAD3: 99,
    KEY_NUMPAD4: 100,
    KEY_NUMPAD5: 101,
    KEY_NUMPAD6: 102,
    KEY_NUMPAD7: 103,
    KEY_NUMPAD8: 104,
    KEY_NUMPAD9: 105,
    KEY_MULTIPLY: 106,
    KEY_ADD: 107,
    KEY_SEPARATOR: 108,
    KEY_SUBTRACT: 109,
    KEY_DECIMAL: 110,
    KEY_DIVIDE: 111,
    KEY_F1: 112,
    KEY_F2: 113,
    KEY_F3: 114,
    KEY_F4: 115,
    KEY_F5: 116,
    KEY_F6: 117,
    KEY_F7: 118,
    KEY_F8: 119,
    KEY_F9: 120,
    KEY_F10: 121,
    KEY_F11: 122,
    KEY_F12: 123,
    KEY_F13: 124,
    KEY_F14: 125,
    KEY_F15: 126,
    KEY_F16: 127,
    KEY_F17: 128,
    KEY_F18: 129,
    KEY_F19: 130,
    KEY_F20: 131,
    KEY_F21: 132,
    KEY_F22: 133,
    KEY_F23: 134,
    KEY_F24: 135,
    KEY_NUM_LOCK: 144,
    KEY_SCROLL_LOCK: 145,
    KEY_COMMA: 188,
    KEY_PERIOD: 190,
    KEY_SLASH: 191,
    KEY_BACK_QUOTE: 192,
    KEY_OPEN_BRACKET: 219,
    KEY_BACK_SLASH: 220,
    KEY_CLOSE_BRACKET: 221,
    KEY_QUOTE: 222,
    KEY_META: 224
  };
})(angular.wilson);;/**
 * Object specific utilities
 *
 * @class ObjectUtils
 *
 */
'use strict';

(function(wilson, _) {


  /**
   * Deletes all object contents
   *
   * @param object
   */
  var clearObject = function(object) {
    for (var member in object) {
      delete object[member];
    }
  };

  /**
   * Replace all @object contents with @newObject properties
   *
   * @param object
   * @param newObject
   */
  var replaceObject = function(object, newObject) {
    clearObject(object);
    _.extend(object, newObject);
  };


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @public
   * @method getPropFromPath
   * @param obj
   * @param path
   */
  var getPropFromPath = function(obj, path) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        objRef = objRef[keys[i]];
      }
    }

    return (typeof objRef === 'object') ? objRef[targetKey] : undefined;
  };


  /**
   * Set the nested object property value based on a dot notated string path
   *
   * @public
   * @method setPropFromPath
   * @param obj
   * @param path
   * @param value
   */
  var setPropFromPath = function(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') {
      objRef[targetKey] = value;
    }
  };


  /**
   * Check the equivalency of 2 objects for a given set of fields and ignored fields.
   *
   * @param objA
   * @param objB
   * @param fields
   * @param ignoredFields
   * @returns {boolean}
   */
  var fieldsEqual = function(objA, objB, fields, ignoredFields) {
    fields        = fields || [];
    ignoredFields = ignoredFields || [];

    var compareTarget = _.omit(_.pick(objA, fields), ignoredFields);
    var isEqual       = true;

    _.each(compareTarget, function(value, key) {
      isEqual = isEqual && _.isEqual(value, objB[key]);
    });

    return isEqual;
  };


  wilson.utils.clearObject      = clearObject;
  wilson.utils.replaceObject    = replaceObject;
  wilson.utils.fieldsEqual      = fieldsEqual;
  wilson.utils.setPropFromPath  = setPropFromPath;
  wilson.utils.getPropFromPath  = getPropFromPath;
})(angular.wilson, _);;/**
 * Support Utils constants
 * @class SupportUtils
 *
 * Author: hunter.novak
 * Date: 9/16/13
 */
'use strict';

(function(wilson, _) {

  var BrowserSupport = {

    detectBrowser: function() {
      var browser = { };

      var detectVersion = function(dataString, versionString) {
        var index = dataString.indexOf(versionString);

        if (index === -1) {
          return;
        }

        return parseFloat(dataString.substring(index + versionString.length + 1));
      };

      // Go through each Browser and check if we are a match, if we are, then determine the version
      var browserFound = false;
      _.each(this.dataBrowser, function(data) {
        // Find Browser
        if (!browserFound) {
          var found = (data.string && data.string.indexOf(data.subString) !== -1) || (data.prop && data.prop.indexOf(data.subString) !== -1);

          if (found) {
              browser[data.identity.toLowerCase()] = true;
              browserFound = true;
              browser.version = detectVersion(navigator.userAgent, data.versionSearch || data.identity) || detectVersion(navigator.appVersion, data.versionSearch || data.identity);
          } else {
            browser[data.identity.toLowerCase()] = false;
          }
        } else {
          browser[data.identity.toLowerCase()] = false;
        }
      });

      return browser;
    },
    dataBrowser: [
      { string: navigator.userAgent,  subString: 'Chrome',  identity: 'Chrome' },
      { string: navigator.userAgent,  subString: 'OmniWeb', identity: 'OmniWeb',    versionSearch: 'OmniWeb/'  },
      { string: navigator.vendor,     subString: 'Apple',   identity: 'Safari',     versionSearch: 'Version' },
      { prop:   window.opera,                               identity: 'Opera',      versionSearch: 'Version' },
      { string: navigator.vendor,     subString: 'iCab',    identity: 'iCab' },
      { string: navigator.vendor,     subString: 'KDE',     identity: 'Konqueror' },
      { string: navigator.userAgent,  subString: 'Firefox', identity: 'Firefox' },
      { string: navigator.vendor,     subString: 'Camino',  identity: 'Camino' },
      { string: navigator.userAgent, subString: 'Netscape', identity: 'Netscape' },
      { string: navigator.userAgent, subString: 'MSIE',     identity: 'MSIE',       versionSearch: 'MSIE' },
      { string: navigator.userAgent, subString: 'Gecko',    identity: 'Mozilla',    versionSearch: 'rv' },
      { string: navigator.userAgent, subString: 'Mozilla',  identity: 'Netscape',   versionSearch: 'Mozilla' }
    ],
    dataOS: [
      { string: navigator.platform,   subString: 'Win',     identity: 'Windows' },
      { string: navigator.platform,   subString: 'Mac',     identity: 'Mac' },
      { string: navigator.userAgent,  subString: 'iPhone',  identity: 'iPhone/iPod' },
      { string: navigator.platform,   subString: 'Linux',   identity: 'Linux' }
    ]

  };

  wilson.utils.browser = BrowserSupport.detectBrowser();

})(angular.wilson, _);;/**
 * Transport Helper Utilities
 *
 * @class TransportUtils
 *
 */
'use strict';

(function(wilson, _) {

  /**
   * Send a safe GET request to a given URL.
   *
   * @public
   * @method sendPing
   *
   * @param url - URL to ping.
   */
  var sendPing = function(url) {
    var ping      = new Image();
    ping.src = url + '?date=' + (new Date()).getTime();
  };

  angular.wilson.utils.sendPing = sendPing;

})(angular.wilson, _);;/**
 * Type specific utilities
 *
 * @class TypeUtils
 *
 */
'use strict';

(function(wilson, _) {


  wilson.utils.parseBoolean = function(val) {
    var value = String(val).toLowerCase();

    switch (value) {
      case 'false':
      case 'nan':
      case 'undefined':
      case 'null':
      case '0':
        return false;
      default:
    }

    return true;
  };


})(angular.wilson, _);;/**
 * Utilities to help with URL (path) manipulation. Inspired byt the node.js 'path' module
 *
 * @class UrlUtils
 *
 */
'use strict';

(function(wilson, _) {
  var PATH_CHARS = ' /';


  /**
   * Translates a URL-encoded sequence into a fully unescaped string
   *
   * @param {string} url
   * @return {string}
   */
  var decodeURL = function(url) {
    if (!url) {
      return '';
    }
    url = String(url);
    return decodeURIComponent( url.replace(/\+/g, '%20') );
  };


  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start
   * @param replace
   * @param arrayToSplice
   */
  var join = function() {
    var fullPath = null;
    var pathParts = _.toArray(arguments);
//    console.log('arguments', arguments);
//    console.log('pathParts', pathParts);

    if (pathParts) {
      if (pathParts.length === 1) {
        //return the sent path
        fullPath = pathParts[0];

      } else if (pathParts.length > 1) {
        var trimmedParts = [];

        //remove the first part of the path and trim the right side only
        trimmedParts.push(_.str.rtrim(pathParts.shift(), PATH_CHARS));

        //remove the last part of the path and trim the left side only
        var lastPart = _.str.ltrim(pathParts.pop(), PATH_CHARS);

        //for each other the other parts trim both sides
        _.each(pathParts, function(pathPart) {
          trimmedParts.push(_.str.trim(pathPart, PATH_CHARS));
        });

        trimmedParts.push(lastPart);

        fullPath = trimmedParts.join('/');
      }
    }

    return fullPath;
  };

  var path = {
    join: join
  };

  wilson.utils.path = path;
  wilson.utils.decodeURL = decodeURL;
})(angular.wilson, _);