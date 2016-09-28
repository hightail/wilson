/**
 * Wilson Framework wrapper for creating behaviors, services, components, and filters on an angular app module.
 *
 * Wraps the creation of angular directives, filters and services to provide a clean syntax for developers to quickly
 * create these app building blocks.
 *
 * @class angular.wilson
 *
 * @author hunter.novak
 * @author justin.fiedler
 *
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved.
 */
'use strict';

(function(window, angular, _) {

  //  __        ___ _
  //  \ \      / (_) |___  ___  _ __
  //   \ \ /\ / /| | / __|/ _ \| '_ \
  //    \ V  V / | | \__ \ (_) | | | |
  //     \_/\_/  |_|_|___/\___/|_| |_|
  //
  // region wilson

  function Wilson(module) {

    var _module                 = module;
    var _appConfig              = null;
    var _cache                  = { components: {}, behaviors: {}, services: {}, filters: {} };

    var _compileProvider        = null;
    var _controllerProvider     = null;
    var _provider               = null;


    //   ____       _            _         __  __      _   _               _
    //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region private methods


    /**
     * Return an appropriately formatted directive name given a prefix and name.
     *
     * @param prefix  - The prefix to prepended to the name
     * @param name    - The actual name to be formatted
     */
    function getDirectiveName(prefix, constructName) {
      return prefix + _.upperFirst(_.camelCase(constructName));
    }


    /**
     * Validates the name, type and definition of a wilson construct
     *
     * @param type - Type of construct - service, filter, behavior or component
     * @param name - Name of service, filter, behavior or component
     * @param def  - Primary service, filter, behavior or component-controller definition
     */
    function validateDefinition(type, name, def) {

      // Basic Validations for type and name here
      if (!_.isString(name)) { throw new Error(type + ' name must be a string!!!'); }
      if (!type)             { throw new Error('Failed to validate definition params. Type is null or undefined!!'); }

      // Definition checks here
      var error   = null;
      var prefix  = (type === 'component') ? 'controller' : 'primary';

      if (_.isEmpty(def))                              { error = 'definition is empty and cannot be processed.'; }
      else if (!_.isFunction(def) && !_.isArray(def))  { error = 'definition must be a Function or an Array!!!'; }

      if (error) { throw new Error((type + ' [' + name + '] ' + prefix + ' ' + error)); }
    }


    function createPageLevelController(name, originalController) {
      return ['ComponentFactoryService', '$injector', '$scope', function(ComponentFactoryService, $injector, $scope) {
        var controller  = this;
        var $element    = angular.element('.' + _appConfig.app.selectors.component + '-' + _.kebabCase(name));

        ComponentFactoryService.init(name, $scope, $element, null, controller);

        $element.data('$WilsonComponentController', controller);

        $injector.invoke(originalController, controller, { $scope: $scope, $element: $element });

        $scope.checkViewDependencies();
      }];
    }


    function createBuildingBlockController(name, originalController) {
      return ['ComponentFactoryService', '$injector', '$scope', '$element', '$attrs', function(ComponentFactoryService, $injector, $scope, $element, $attrs) {
        var controller = this;
        ComponentFactoryService.init(name, $scope, $element, $attrs, controller);

        // Hack/Magic - Register the Wilson component controller on this element
        // This allows us to require: ['WilsonComponent'] in the link method
        $element.data('$WilsonComponentController', controller);

        $injector.invoke(originalController, controller, { $scope: $scope, $element: $element, $attrs: $attrs });

        // Register this component as a view dependency of its parent
        if ($scope.parentComponent) { $scope.parentComponent.registerViewDependency(); }
      }];
    }


    function createLinkMethod(originalLink) {
      // Override the link method to handle view dependency checking
      if (originalLink) {
        return function($scope, $element, $attrs, ctrl) {
          originalLink($scope, $element, $attrs, ctrl);
          $scope.checkViewDependencies();
        }
      }

      return function($scope) { $scope.checkViewDependencies(); };
    }


    function defineAppRoutes(routes, routeProvider) {
      // Enforce null route
      var nullRouteIdx = _.findIndex(routes, { path: null });

      if (nullRouteIdx === -1)              { throw new Error('Null route MUST be specified in routes!');       }
      if (nullRouteIdx < routes.length - 1) { throw new Error('Null route MUST be the last specified route!');  }

      // Define Application URL Routes
      _.each(routes, function(routeInfo) { createRoute(routeInfo, routes, routeProvider); });
    }


    function getRouteOptions(matchedPath, routes) {
      // find the matching route configuration for the given path
      // If no matching route was found then default to the null path route
      var routeConfig   = _.find(routes, { path: matchedPath });
      routeConfig       = routeConfig || _.find(routes, { path: null });

      // return the options from the matching route
      return (routeConfig && routeConfig.options) ? _.clone(routeConfig.options) : { };
    }


    /**
     * Define a route for the application from a given path and resulting state. The
     * given path will become a route that will map to the given state. The site control
     * component will then use the mapped state for a route to load the appropriate top-level
     * workflow component and compile it into the view.
     *
     * @param routeInfo     - The route definition data for this explicit route
     * @param routes        - The collection of all route objects
     * @param routeProvider - The angular routeProvider reference on which to declare the final route definition
     */
    function createRoute(routeInfo, routes, routeProvider) {
      // Determine early failures
      if (!routeProvider)                 { throw new Error('No RouteProvider included! Cannot create route!'); }
      if (_.isUndefined(routeInfo.path))  { throw new Error('Route information is invalid! Missing path definition: \n' + JSON.stringify(routeInfo, undefined, 2)); }

      var routePromise = null;

      // Create routing data for this route
      var routingData = {
        controller: buildClassName(_appConfig.app.selectors.component, routeInfo.component),
        resolve: {
          routeLabel: [function() { return routeInfo.label || routeInfo.component; }],
          routeInfo:  ['$route', '$q', '$location', 'AppStateService', 'IRouteService',
            function($route, $q, $location, AppStateService, IRouteService) {
              var currentRoute  = $location.path();
              var options       = getRouteOptions($route.current.originalPath, routes);

              // Handle special routing functionality via IRouteService
              routePromise = IRouteService.handleRouteChange(currentRoute, options, routeInfo).then(function() {
                // Write routeInfo to localStorage for this component
                var resolvedRouteInfo = _.extend(options, (_.isObject(options.defaultParams) ? options.defaultParams : {}), $route.current.params);

                AppStateService.setPersistentValues(routeInfo.component, resolvedRouteInfo);

                return resolvedRouteInfo;
              }, $q.reject);

              return routePromise;
            }
          ],
          dependencies: ['$q', 'IRouteService', function($q, IRouteService) {
            var promises = [];

            // Call load dependencies on IRouteService if exposed (this method should return a $q promise)
            promises.push(IRouteService.loadDependencies ? IRouteService.loadDependencies(routeInfo) : $q.when());
            promises.push(IRouteService.loadSession      ? IRouteService.loadSession()               : $q.when());

            return $q.allSettled(promises);
          }],
          $template: ['ComponentLoaderService', '$route', '$q', '$window', '$templateCache', '$rootScope', 'IRouteService',
            function(ComponentLoaderService, $route, $q, $window, $templateCache, $rootScope, IRouteService) {
              routePromise = routePromise || $q.when();   // Ensure that in ANY case we will always have a promise set here

              // Resolve out our promise to load this component and its templates
              return routePromise.then(function() {

                // Update page title
                if (routeInfo.title)  { $rootScope.page.title = IRouteService.translateTitle(routeInfo.title); }
                else                  { delete $rootScope.page.title; }

                return ComponentLoaderService.load(routeInfo.component);
              }, $q.reject).then(function(data) {

                // Force a reload to update if out of date component
                if (data.version !== angular.wilson.config.app.version) {
                  console.log('Component is out of date! Reloading app.');
                  $window.location.reload();
                } else {
                  return $templateCache.get(routeInfo.component);
                }
              }, function(err) {
                console.log('Failed to load component [' + routeInfo.component + ']: Unknown server error.');
                return $q.reject('<div>Failed to Load!!!</div>');  // Wilson server is down
              });
            }
          ],
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

      // Declare routes on the routeProvider
      if (routeInfo.path !== null)  { routeProvider.when(routeInfo.path, routingData); }
      else                          { routeProvider.otherwise(routingData); }
    }

    // endregion


    //   ____        _     _ _        __  __      _   _               _
    //  |  _ \ _   _| |__ | (_) ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | | | | '_ \| | |/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |_| | |_) | | | (__  | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|    \__,_|_.__/|_|_|\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region public methods


    /***** Public utils namespaces for decorating utility functions *****/
    this.utils  = {};

    /***** Public config property *****/
    this.config = _appConfig;


    /**
     * Sets the app config object.
     *
     * @param config - Object to be set as the new _appConfig
     */
    this.setAppConfig = function setAppConfig(config) { _appConfig = config; };


    this.service = function defineService(name, definition) {
      validateDefinition('service', name, definition);

      if (!_cache.services[name]) {
        _cache.services[name] = true;

        var provider = _provider || _module;
        provider.factory(name, definition);
      }
    };


    this.filter = function defineFilter(name, definition) {
      validateDefinition('filter', name, definition);

      var filterName = _.camelCase(name);

      if (!_cache.filters[filterName]) {
        _cache.filters[filterName] = true;

        _module.filter(filterName, _.isArray(definition) ? definition : function() {
          return definition;
        });
      }
    };

    this.component = function defineComponent(name, config) {
      var directiveName = getDirectiveName(_appConfig.app.selectors.component, name);

      if (!_cache.components[directiveName]) {
        _cache.components[directiveName] = true;

        // Initialize the config with defaults
        var fullConfig = {
          restrict: 'EA',
          templateUrl: name.toLowerCase(),
          replace:  true, // Cause IE8, bro...
          scope: {}
        };

        // Extend default parameters
        _.extend(fullConfig, config);

        // Validate Component Definition
        validateDefinition('component', name, fullConfig.controller);

        // Var to store the appropriate compileProvider or controllerProvider on which to declare our directive
        var provider = false;

        if (fullConfig.page) {
          // Build and set controller -- Passing the original controller
          fullConfig.controller = createPageLevelController(name, fullConfig.controller);

          // Create a new controller for this component
          provider      = _controllerProvider || wilsonModule;
          var register  = provider.register   || provider.controller;
          register(directiveName, fullConfig.controller);
        } else {
          // Build and set controller and link method -- passing the original controller and link
          fullConfig.controller = createBuildingBlockController(name, fullConfig.controller);
          fullConfig.link       = createLinkMethod(fullConfig.link);

          // Create a new directive for the component
          provider = _compileProvider || wilsonModule;
          provider.directive(directiveName, function() { return fullConfig; });
        }
      }
    };


    this.behavior = function defineBehavior(name, definition) {
      var directiveName = getDirectiveName(_appConfig.app.selectors.behavior, name);

      if (!_cache.behaviors[directiveName]) {
        _cache.behaviors[directiveName] = true;

        // Validate Directive Definition
        validateDefinition('behavior', name, definition)

        // Determine if we are loading this dynamically with compileProvider
        var provider = _compileProvider || wilsonModule;

        // Create a new directive for this behavior
        provider.directive(directiveName, definition);
      }
    };

    // endregion


    //    ___       _ _   _       _ _          _   _
    //   |_ _|_ __ (_) |_(_) __ _| (_)______ _| |_(_) ___  _ __
    //    | || '_ \| | __| |/ _` | | |_  / _` | __| |/ _ \| '_ \
    //    | || | | | | |_| | (_| | | |/ / (_| | |_| | (_) | | | |
    //   |___|_| |_|_|\__|_|\__,_|_|_/___\__,_|\__|_|\___/|_| |_|
    //
    // region initialization


    // Angular Module Config Routine
    _module.config(['$interpolateProvider', '$locationProvider', 'i18nextServiceProvider', '$routeProvider', 'localStorageServiceProvider', '$compileProvider', '$controllerProvider', '$provide',
      function wilsonConfig($interpolateProvider, $locationProvider, i18nextServiceProvider, $routeProvider, localStorageServiceProvider, $compileProvider, $controllerProvider, $provide) {

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
          supportedLngs:              _.map(config.i18n.supportedLngs, 'locale'),
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

        // Declare Routes on Angular
        defineAppRoutes(config.routes, $routeProvider);
      }
    ]);

    // Angular Module Config Routine
    _module.run(['$rootScope', '$templateCache', '$location', '$timeout',
      function wilsonRun($rootScope, $templateCache, $location, $timeout) {

        // Local No Operation Function
        var noop = function() {};


        //   ____             _     ____                         _   _      _
        //  |  _ \ ___   ___ | |_  / ___|  ___ ___  _ __   ___  | | | | ___| |_ __   ___ _ __ ___
        //  | |_) / _ \ / _ \| __| \___ \ / __/ _ \| '_ \ / _ \ | |_| |/ _ \ | '_ \ / _ \ '__/ __|
        //  |  _ < (_) | (_) | |_   ___) | (_| (_) | |_) |  __/ |  _  |  __/ | |_) |  __/ |  \__ \
        //  |_| \_\___/ \___/ \__| |____/ \___\___/| .__/ \___| |_| |_|\___|_| .__/ \___|_|  |___/
        //                                         |_|                       |_|
        // region rootScope helpers

        // Set Default Page Title  TODO: Drive this from a config setting
        $rootScope.page = { title: 'Wilson' };


        /**
         * Method to trigger an angular digest.
         *
         * @param fn
         */
        $rootScope.triggerDigest = function wilsonTriggerDigest() { $timeout(noop); };


        /**
         * Method to bind a given function and context to run and then trigger an angular digest cycle.
         *
         * @param method
         * @param context
         * @returns {*}
         */
        $rootScope.bindToDigest = function wilsonBindToDigest(method, context) {
          context = context || this;

          var bound = function() {
            method.apply(context, arguments);
            $rootScope.triggerDigest();
          };

          return method ? bound : noop;
        };

        // endregion

      }
    ]);

    // endregion

  }

  // endregion



  /**
   * Wilson Angular Module Declaration and Framework Instantiation
   */
  var wilsonModule  = angular.module('wilson', ['ngRoute', 'LocalStorageModule', 'wilson.config', 'wilson.i18n', 'wilson.prerender', 'wilson.decorators']);
  var wilson        = new Wilson(wilsonModule);

  // Set Global window and angular instance references
  angular.wilson = window.wilson = wilson;

})(this, angular, _);

/**
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
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('AppStateService', ['localStorageService', function(localStorageService) {

  
  //   ____                  _            __  __      _   _               _
  //  / ___|  ___ _ ____   _(_) ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  \___ \ / _ \ '__\ \ / / |/ __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //   ___) |  __/ |   \ V /| | (_|  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //  |____/ \___|_|    \_/ |_|\___\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  // region service methods

  /**
   * Retrieves a value from this component's persistent storage
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param defaultValue    The value to return if the @key is not found
   * @returns {*}
   */
  var getPersistentValue = function getPersistentValue(localStorageKey, key, defaultValue) {
    var keyValue          = defaultValue;
    var localStorageValue = localStorageService.get(localStorageKey);

    // If a key is provided then only return the key's value
    if (localStorageValue && key) { keyValue = localStorageValue[key]; }

    // If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) { keyValue = defaultValue; }

    return keyValue;
  };


  /**
   * Stores @keyValueHash properties under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param keyValueHash
   * @returns {*}
   */
  var setPersistentValues = function setPersistentValues(localStorageKey, keyValueHash) {
    // Get the current localStorage value
    var state = localStorageService.get(localStorageKey) || {};

    // Extend the current values with the new ones
    _.extend(state, keyValueHash);

    // Save changes
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
  var setPersistentValue = function setPersistentValue(localStorageKey, key, value) {
    var keyValueHash  = {};
    keyValueHash[key] =  value;

    setPersistentValues(localStorageKey, keyValueHash);
  };

  // endregion


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    getPersistentValue:   getPersistentValue,
    setPersistentValue:   setPersistentValue,
    setPersistentValues:  setPersistentValues
  };

  return service;
}]);

/**
 * This service provides base class extension and default functionality to component controllers.
 *
 * @class ComponentFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ComponentFactoryService',
  ['$rootScope', '$timeout', 'StateMachineService', 'i18nextService', 'AppStateService', 'TranslationOverrideService', 'ComponentPrerenderService',
  function($rootScope, $timeout, StateMachineService, i18nextService, AppStateService, TranslationOverrideService, ComponentPrerenderService) {

    //   ____       _            _         __  __      _   _               _
    //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region private methods

    function noop() {}

    function getParentComponentScope(scope) {

      // Get the direct parent scope
      var parentScope = scope.$parent;

      // Continue up the scope hierarchy until we find the next Wilson Component scope
      while (parentScope && !_.has(parentScope, 'componentCName')) {
        parentScope = parentScope.$parent;
      }

      // Return the parent Wilson Component scope if found, otherwise, just the default parent scope
      return parentScope || scope.$parent;
    }

    // endregion


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
    var init = function wilsonComponentInit(componentName, $scope, $element, $attrs, controller) {

      // Closure var for our digest cancel
      var cancelDigestUpdate    = null;

      // Text Overrides and Ignored Overrides
      var textOverrides         = {};
      var ignoredTextOverrides  = {};

      // Parent Scope
      var parentComponentScope  = getParentComponentScope($scope);

      /***** Scope Decorations *****/

      $scope.componentCName   = controller.componentCName = componentName;  // Decorate the Wilson Component Name onto both controller and $scope
      $scope.parentComponent  = parentComponentScope;                       // Decorate the parent Wilson Component scope onto this component's scope
      $scope.stateMachine     = { current: 'NoStateMachine' };              // Default StateMachine


      /***** Configuration Attributes *****/

      // ATTRIBUTE: expose  - Used for exposing this components scope on the parent component
      var exposeName = $attrs ? $attrs.expose : false;
      if (exposeName) { parentComponentScope[exposeName] = $scope; }


      //   ____                         __  __      _   _               _
      //  / ___|  ___ ___  _ __   ___  |  \/  | ___| |_| |__   ___   __| |___
      //  \___ \ / __/ _ \| '_ \ / _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
      //   ___) | (_| (_) | |_) |  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
      //  |____/ \___\___/| .__/ \___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
      //                  |_|
      //
      // region scope methods


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
      $scope.translate = controller.translate = function wcTranslate(text, options) {
        // Create a default callback if needed
        options = options || {};

        // Default namespace is component name
        if (typeof options.ns !== 'string' || options.ns === '') { options.ns = componentName; }

        if (!ignoredTextOverrides[text]) {
          // Check if the text has an override
          if (textOverrides[text]) {
            options.ns = textOverrides[text];
          } else if (TranslationOverrideService.hasOverride(options.ns, text)) {
            // The text has an override, now determine if it applies to this component
            for (var ancestor = $scope.parentComponent; ancestor !== null; ancestor = ancestor.parentComponent) {
              if (TranslationOverrideService.hasOverrideForNamespace(options.ns, text, ancestor.componentCName)) {
                options.ns = textOverrides[text] = ancestor.componentCName;
                break;
              }
            }

            // If the namespace is still set to this component then mark as ignored
            if (options.ns === componentName) { ignoredTextOverrides[text] = true; }
          }
        }

        // Use the i18n provider to translate the text
        return i18nextService.translate(text, options);
      };


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
      $scope.overrideText = controller.overrideText = function wcOverrideText(overrideNamespace, textKey, overrideText) {
        TranslationOverrideService.addOverride(overrideNamespace, componentName, textKey);

        // Call translate to add the translation to the locale JSON
        controller.translate(textKey, { defaultValue: overrideText });
      };


      /**
       * Sets @scopePropertyName on $scope to @defaultValue if it is not already set
       *
       * @param scopePropertyName
       * @param defaultValue
       * @returns {*}
       */
      $scope.defaultValue = function wcDefaultValue(scopePropertyName, defaultValue) {
        var value = $scope[scopePropertyName];
        if (_.isUndefined(value) || _.isNull(value)) {
          $scope[scopePropertyName] = defaultValue;
        }

        return $scope[scopePropertyName];
      };


      /**
       * Method to trigger a digest to re-render the view.
       */
      $scope.triggerDigest = function wcTriggerDigest() {
        $timeout(noop);
      };

      
      /**
       * Method to bind a function to run and trigger a digest
       */
      $scope.bindToDigest = function wcBindToDigest(method, context) {
        context = context || this;

        var bound = function() {
          method.apply(context, arguments);
          $scope.triggerDigest();
        };

        return method ? bound : noop;
      };
      
      // endregion


      //    ____            _             _ _             __  __      _   _               _
      //   / ___|___  _ __ | |_ _ __ ___ | | | ___ _ __  |  \/  | ___| |_| |__   ___   __| |___
      //  | |   / _ \| '_ \| __| '__/ _ \| | |/ _ \ '__| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
      //  | |__| (_) | | | | |_| | | (_) | | |  __/ |    | |  | |  __/ |_| | | | (_) | (_| \__ \
      //   \____\___/|_| |_|\__|_|  \___/|_|_|\___|_|    |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
      //
      // region controller methods


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
      controller.setState = function wcSetState(cfg, onStateCompleteCallback) {
        // Create noop callback if needed
        onStateCompleteCallback = onStateCompleteCallback || function() {};

        var fsm = $scope.stateMachine;

        if (cfg) {
          var cfgInitialState = cfg.initial;
          var attrInitialState;

          // Check if there is an initialState attr on the component
          if ($attrs) {
            var attrState = $attrs.initialState;
            if (attrState && StateMachineService.hasState(cfg, attrState)) {
              attrInitialState = attrState;
            }
          }

          var initialState  = attrInitialState || cfgInitialState;
          cfg.initial       = initialState;
          fsm               = $scope.stateMachine = StateMachineService.create(cfg);
        }

        // Callback
        onStateCompleteCallback(fsm);
      };


      /**
       * Retrieves a value from this component's persistent storage (localStorage)
       *
       * @param key
       * @param defaultValue    The value to return if the @key is not found
       * @returns {*}
       */
      controller.getPersistentValue = function wcGetPersistentValue(key, defaultValue) {
        return AppStateService.getPersistentValue(componentName, key, defaultValue);
      };


      /**
       * Stores @key:@value for this component in localStorage
       *
       * @param keyValueHash
       * @returns {*}
       */
      controller.setPersistentValue = function wcSetPersistentValue(key, value) {
        return AppStateService.setPersistentValue(componentName, key, value);
      };


      /**
       * Stores @keyValueHash properties for this component
       *
       * @param keyValueHash
       * @returns {*}
       */
      controller.setPersistentValues = function wcSetPersistentValues(keyValueHash) {
        return AppStateService.setPersistentValues(componentName, keyValueHash);
      };


      /**
       * Sets a $watch on $scope.key and will automatically persist it on any changes
       *
       * @param {string} key    A key to a value on $scope. Must be a string
       * @param defaultValue    The value to use if no previous value is set for @key
       */
      controller.watchAndPersist = function wcWatchAndPersist(key, defaultValue) {
        //Add watch to key value
        $scope.$watch(key, function(newValue) {
          controller.setPersistentValue(key, newValue);
        });

        defaultValue = controller.getPersistentValue(key, defaultValue);

        $scope[key] = defaultValue;
      };


      /************************************/
      /***** AUTO EVENT REGISTRATIONS *****/
      /************************************/
      controller.auto = {};


      /**
       * Sets a $watch that will automatically be removed when the $scope is $destroy'ed
       * @param key
       * @param watchHandler
       */
      controller.auto.watch = function wcWatch(key, watchHandler) {
        //Add watch to key value
        var removeWatch = $scope.$watch(key, watchHandler);

        var removeDestroy = $scope.$on('$destroy', function() {
          removeWatch();
          removeDestroy();
        });
      };

      /**
       * Adds to @handler on @signal and automatically
       * removes when the Component is destroyed
       *
       * @param signal
       * @param handler
       */
      controller.auto.add = function wcSignalAdd(signal, handler) {

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
      controller.auto.on = function wcScopeOn(eventName, handler) {

        var removeOnHandler = $scope.$on(eventName, handler);

        var removeDestroy = $scope.$on('$destroy', function() {
          removeOnHandler();
          removeDestroy();
        });
      };


      /**
       * Adds a handler to be called after any completed angular digest cycle.
       *
       * @param handle
       */
      controller.auto.afterDigest = function wcAfterDigest(handle) {

        // Function that will run after the digest
        function afterDigest(callback) {
          if ($scope.$$destroyed) { return; }

          // Setup a watch to run once
          cancelDigestUpdate = $scope.$watch(function() {
            cancelDigestUpdate();
            $timeout(function() {
              callback();
              afterDigest(callback);
            }, 0, false);
          });
        }

        afterDigest(handle);
      };


      // endregion


      // TODO: We need to destroy the state machine (remove its timeouts)
      // $scope.$on('$destroy', function() { });

      // Decorate Prerendering Support
      ComponentPrerenderService.addPrerenderMethods($scope, controller);
    };

    // Service Object Definition
    var service = { init: init };

    return service;
  }]
);

/**
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
    var config            = angular.wilson.config;
    var componentVersion  = config.app.version || 'none';
    var tmp               = config.app.updateInterval.split(' ');
    var updateInterval    = { count: tmp[0], unit: tmp[1] };
    var hostUrl           = '';

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
    var loadedComponents  = {};
    var lastUpdateCheck   = moment();

    /**
     * Attempts to get the app version from the server
     *
     * @param componentName
     * @returns { version: '1.X.X' }
     */
    var getCurrentAppVersion = function() {
      var deferred = $q.defer();

      var versionPath = config.app.mountpath + '/version';

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

      var componentPath = _.sprintf('%s/%s/component/%s', config.app.mountpath, componentVersion, componentName);
      componentPath = angular.wilson.utils.path.join(hostUrl, componentPath);

      //append connection filters
      if (config.app.connectionFilters) {
        componentPath += _.sprintf('/%s', config.app.connectionFilters);
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

/**
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
          if (!(key === 'this' || _.startsWith(key, '$'))) {
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

        //console.log(_.sprintf('Added dep to %s. Count: %d', componentName, viewDepCount));
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
}]);
/**
 * This service decorates custom methods onto commonly shared libraries
 *
 * @class DecoratorService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author michael.chen
 * @since 1.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.module('wilson.decorators', []).config(['$provide', function($provide) {

  // Decorate $q with allSettled
  $provide.decorator('$q', ['$delegate', function ($delegate) {
    var $q = $delegate;

    // Implementation of allSettled function from Kris Kowal's Q:
    // https://github.com/kriskowal/q/wiki/API-Reference#promiseallsettled
    $q.allSettled = $q.allSettled || function allSettled(promises) {

      function wrap(promise) {
        return $q.when(promise).then(
          function (value)  { return { state: 'fulfilled', value: value };  },
          function (reason) { return { state: 'rejected', reason: reason }; }
        );
      }

      var wrapped = angular.isArray(promises) ? [] : {};

      angular.forEach(promises, function(promise, key) {
        if (!wrapped.hasOwnProperty(key)) { wrapped[key] = wrap(promise); }
      });

      return $q.all(wrapped);
    };

    return $q;
  }]);
}]);

/**
 * Service to help with function deprecation
 *
 * @class DeprecationService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('DeprecationService', function() {
  
  /**
   * Class to handle function deprecation
   *
   * @param func                  The deprecated function
   * @param funcContext           The context object (thisArg) for the deprecated function
   * @param deprecatedFuncName    The human readable function name of the deprecated function (object.myDeprecatedFunction())
   * @param newFuncName           The human readable function name of the new function (object.myNewFunction())
   * @constructor
   */
  function deprecateFunction(func, funcContext, deprecatedFuncName, newFuncName) {
    return function() {
      console.log(_.sprintf('Warning: %s() is deprecated. Use %s() instead', deprecatedFuncName, newFuncName));
      return func.apply(funcContext, _.toArray(arguments))
    };
  }


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = { deprecateFunction: deprecateFunction };

  return service;
});

/**
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

/**
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
            //console.log(_.sprintf('SUCCESS: %s LOADED (%s)', src, textStatus));
            callback();
          })
          .fail(function( jqxhr, settings, exception ) {
            console.log(_.sprintf('ERROR: %s FAILED TO LOAD', src));
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
      var newTemplates  = _.difference(_.map(resources.templates, 'id'), _.keys(templates));

      // Load any and all new templates
      _.each(newTemplates, function(templateId) {
        var template = _.find(resources.templates, { id: templateId });
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

/**
 * A service extension of HtStateMachine that works with AngularJS. Use this service
 * if you need Angular data-binding to update automatically on state changes.
 *
 * @class StateMachineService
 * @extends HtStateMachine
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('StateMachineService', ['$timeout', function($timeout) {

  // Make HtStateMachine an extension of StateMachine
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
  HtStateMachine.create = function htsmCreate(cfg, target) {
    cfg.error = cfg.error || function() { };  // Default invalid state change error to a noop

    decorateTimeoutCallbacks(cfg);

    var fsm     = StateMachine.create(cfg, target);
    fsm.states  = HtStateMachine.getStates(cfg);

    return fsm;
  };


  /**
   * Returns a StateMachine callback function that first runs newCallback
   * and then calls the pre-exiting callback (if there is one)
   *
   * @public
   * @method prependCallback
   * @param callbacks         The callbacks object
   * @param callbackName      The callback name to prepend to
   * @param newCallback       The new callback function
   *
   * @returns Function - The merged callback
   */
  HtStateMachine.preprendCallback = function htsmPrependCallback(callbacks, callbackName, newCallback) {
    var origCallback = callbacks[callbackName];

    var mergedCallback = function(name, from, to, args) {
      // Fire new callback
      newCallback.apply(this, [name, from, to, args]);

      // Fire original callback
      if (origCallback) { origCallback.apply(this, [name, from, to, args]); }
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
  HtStateMachine.getStates = function htsmGetStates(cfg) {
    var states = [];
    var events = cfg.events || [];

    function appendStates(stateArray) {
      if (!_.isArray(stateArray)) { stateArray = [stateArray]; }
      states = states.concat(stateArray);
    }

    // Add all states from the events collection
    _.each(events, function(event) {
      appendStates(event.to);
      appendStates(event.from);
    });

    // Make the list unique
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
  HtStateMachine.hasState = function htsmHasState(cfg, stateName) {
    var states = HtStateMachine.getStates(cfg);
    return (_.indexOf(states, stateName) >= 0) ? true : false;
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
  function decorateTimeoutCallbacks(cfg) {

    var callbacks     = cfg.callbacks     || {};
    var timeouts      = cfg.timeouts      || [];

    // Decorate Handlers for each timeout
    _.each(timeouts, function(timeout) {

      // Add ENTER STATE callback to set timeout
      var callbackName = 'onenter' + timeout.state;
      callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to) {
        var fsm             = this;
        var timeoutCallback = function() { fsm[timeout.timeoutEvent](); };

        $timeout.cancel(fsm.curTimeout);
        fsm.curTimeout = $timeout(timeoutCallback, timeout.duration);
      });

      // Add LEAVE STATE callback to set timeout
      callbackName            = 'onleave' + timeout.state;
      callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function() {
        var fsm = this;
        $timeout.cancel(fsm.curTimeout);
      });

      if (timeout.refreshEvent) {
        // Add REFRESH EVENT callbacks
        callbackName            = 'onbefore' + timeout.refreshEvent;
        callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to, args) {
          if (from === timeout.state) {
            var fsm = this;
            fsm['onenter' + timeout.state](name, from, to, args);
          }
        });
      }
    });

    cfg.callbacks = callbacks;
  }


  // Return HtStateMachine as the Service
  return HtStateMachine;
}]);

/**
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

/**
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

    window.i18next.init(options);
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
      return window.i18next.t(text, options);
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
      translate: $window.i18next.t,

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

/**
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
})(angular.wilson, _);
/**
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

/**
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

/**
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
    KEY_HYPHEN: 189,
    KEY_PERIOD: 190,
    KEY_SLASH: 191,
    KEY_BACK_QUOTE: 192,
    KEY_OPEN_BRACKET: 219,
    KEY_BACK_SLASH: 220,
    KEY_CLOSE_BRACKET: 221,
    KEY_QUOTE: 222,
    KEY_META: 224
  };
})(angular.wilson);
/**
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
})(angular.wilson, _);
/**
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

})(angular.wilson, _);
/**
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

})(angular.wilson, _);
/**
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


})(angular.wilson, _);
/**
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
        trimmedParts.push(_.trimEnd(pathParts.shift(), PATH_CHARS));

        //remove the last part of the path and trim the left side only
        var lastPart = _.trimStart(pathParts.pop(), PATH_CHARS);

        //for each other the other parts trim both sides
        _.each(pathParts, function(pathPart) {
          trimmedParts.push(_.trim(pathPart, PATH_CHARS));
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