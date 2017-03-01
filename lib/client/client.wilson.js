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
    var _filterProvider         = null;
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

      if (!_.isFunction(def) && _.isEmpty(def))        { error = 'definition is empty and cannot be processed.'; }
      else if (!_.isFunction(def) && !_.isArray(def))  { error = 'definition must be a Function or an Array!!!'; }

      if (error) { throw new Error((type + ' [' + name + '] ' + prefix + ' ' + error)); }
    }


    function createPageLevelController(name, originalController, scriptDependencies) {
      return ['ComponentFactoryService', 'ResourceLoaderService', '$injector', '$scope',
        function(ComponentFactoryService, ResourceLoaderService, $injector, $scope) {
          var controller  = this;
          var $element    = angular.element('.' + _appConfig.app.selectors.component + '-' + _.kebabCase(name));

          ComponentFactoryService.init(name, $scope, $element, null, controller);

          $element.data('$WilsonComponentController', controller);

          $injector.invoke(originalController, controller, { $scope: $scope, $element: $element });

          $scope.checkViewDependencies();

          // If this component has scriptDependencies, load them and then fire an event
          if (_.isArray(scriptDependencies) && !_.isEmpty(scriptDependencies)) {
            ResourceLoaderService.loadResourceScripts(scriptDependencies).then(
              function() { $scope.$emit(name + ':dependencies-loaded'); },
              function() { $scope.$emit(name + ':dependencies-failed'); }
            );
          }
        }
      ];
    }


    function createBuildingBlockController(name, originalController, scriptDependencies) {
      return ['ComponentFactoryService', 'ResourceLoaderService', '$injector', '$scope', '$element', '$attrs',
        function(ComponentFactoryService, ResourceLoaderService, $injector, $scope, $element, $attrs) {
          var controller = this;
          ComponentFactoryService.init(name, $scope, $element, $attrs, controller);

          // Hack/Magic - Register the Wilson component controller on this element
          // This allows us to require: ['WilsonComponent'] in the link method
          $element.data('$WilsonComponentController', controller);

          $injector.invoke(originalController, controller, { $scope: $scope, $element: $element, $attrs: $attrs });

          // Register this component as a view dependency of its parent
          if ($scope.parentComponent) { $scope.parentComponent.registerViewDependency(); }

          // If this component has scriptDependencies, load them and then fire an event
          if (_.isArray(scriptDependencies) && !_.isEmpty(scriptDependencies)) {
            ResourceLoaderService.loadResourceScripts(scriptDependencies).then(
              function() { $scope.$emit(name + ':dependencies-loaded'); },
              function() { $scope.$emit(name + ':dependencies-failed'); }
            );
          }
        }
      ];
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
        controller: getDirectiveName(_appConfig.app.selectors.component, routeInfo.component),
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
    this.setAppConfig = function setAppConfig(config) { this.config = _appConfig = config; };


    /**
     * Declare a filter on Angular.
     *
     * @param name          - Filter Name
     * @param definition    - Array or Function definition of the filter
     */
    this.filter = function defineFilter(name, definition) {
      validateDefinition('filter', name, definition);

      var filterName = _.camelCase(name);

      if (!_cache.filters[filterName]) {

        var provider = _filterProvider || _module;
        var filter   = provider.filter || provider.register;

        filter(filterName, _.isArray(definition) ? definition : function() {
          return definition;
        });

        // Mark as cached
        _cache.filters[filterName] = true;
      }
    };


    /**
     * Declare an element-based directive on Angular. This element will represent
     * a reusable component. Component definitions must have an explicit controller declared.
     *
     * @param name          - Component Name
     * @param definition    - Object definition of the component directive
     */
    this.component = function defineComponent(name, config) {
      var directiveName = getDirectiveName(_appConfig.app.selectors.component, name);

      if (!_cache.components[directiveName]) {

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
          fullConfig.controller = createPageLevelController(name, fullConfig.controller, fullConfig.dependencies);

          // Create a new controller for this component
          provider      = _controllerProvider || _module;
          var register  = provider.register   || provider.controller;
          register(directiveName, fullConfig.controller);
        } else {
          // Build and set controller and link method -- passing the original controller and link
          fullConfig.controller = createBuildingBlockController(name, fullConfig.controller, fullConfig.dependencies);
          fullConfig.link       = createLinkMethod(fullConfig.link);

          // Create a new directive for the component
          provider = _compileProvider || _module;
          provider.directive(directiveName, function() { return fullConfig; });
        }

        // Mark as cached
        _cache.components[directiveName] = true;
      }
    };


    /**
     * Declare an attribute-based directive on Angular.
     *
     * @param name          - Behavior Name
     * @param definition    - Function or Array definition of the behavior directive
     */
    this.behavior = function defineBehavior(name, definition) {
      var directiveName = getDirectiveName(_appConfig.app.selectors.behavior, name);

      if (!_cache.behaviors[directiveName]) {
        // Validate Directive Definition
        validateDefinition('behavior', name, definition)

        // Determine if we are loading this dynamically with compileProvider
        var provider = _compileProvider || _module;

        // Create a new directive for this behavior
        provider.directive(directiveName, definition);

        // Mark as cached
        _cache.behaviors[directiveName] = true;
      }
    };


    /**
     * Declare a service on Angular.
     *
     * @param name          - Service Name
     * @param definition    - Array or Function definition of the service
     */
    this.service = function defineService(name, definition) {
      validateDefinition('service', name, definition);

      if (!_cache.services[name]) {
        var provider = _provider || _module;
        provider.factory(name, definition);

        // Mark as cached
        _cache.services[name] = true;
      }
    };


    // Added convenience Aliases for services
    this.class    = this.service;
    this.factory  = this.service;
    this.utility  = this.service;
    this.resource = this.service;

    // endregion


    //    ___       _ _   _       _ _          _   _
    //   |_ _|_ __ (_) |_(_) __ _| (_)______ _| |_(_) ___  _ __
    //    | || '_ \| | __| |/ _` | | |_  / _` | __| |/ _ \| '_ \
    //    | || | | | | |_| | (_| | | |/ / (_| | |_| | (_) | | | |
    //   |___|_| |_|_|\__|_|\__,_|_|_/___\__,_|\__|_|\___/|_| |_|
    //
    // region initialization


    // Angular Module Config Routine
    _module.config(['$interpolateProvider', '$locationProvider', 'i18nextServiceProvider', '$routeProvider', 'localStorageServiceProvider', '$compileProvider', '$controllerProvider', '$filterProvider', '$provide',
      function wilsonConfig($interpolateProvider, $locationProvider, i18nextServiceProvider, $routeProvider, localStorageServiceProvider, $compileProvider, $controllerProvider, $filterProvider, $provide) {

        var config = angular.wilson.config;

        // Store our Providers
        _compileProvider    = $compileProvider;
        _controllerProvider = $controllerProvider;
        _filterProvider     = $filterProvider;
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
        $rootScope.triggerDigest = function wilsonTriggerDigest() { return $timeout(noop); };


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
  function getPersistentValue(localStorageKey, key, defaultValue) {
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
  function setPersistentValues(localStorageKey, keyValueHash) {
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
  function setPersistentValue(localStorageKey, key, value) {
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

      // Return the parent Wilson Component scope if found, otherwise null
      return _.has(parentScope, 'componentCName') ? parentScope : null;
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
    function wilsonComponentInit(componentName, $scope, $element, $attrs, controller) {

      // Closure var for our digest cancel
      var _cancelDigestUpdate   = null;

      // Text Overrides and Ignored Overrides
      var _textOverrides        = {};
      var _ignoredTextOverrides = {};

      // Parent Scope
      var _parentComponentScope = getParentComponentScope($scope);

      /***** Scope Decorations *****/

      $scope.componentCName     = controller.componentCName = componentName;  // Decorate the Wilson Component Name onto both controller and $scope
      $scope.parentComponent    = _parentComponentScope;                      // Decorate the parent Wilson Component scope onto this component's scope
      $scope.stateMachine       = { current: 'NoStateMachine' };              // Default StateMachine


      /***** Configuration Attributes *****/

      // ATTRIBUTE: expose  - Used for exposing this components scope on the parent component
      var exposeName = $attrs ? $attrs.expose : false;
      if (exposeName && _parentComponentScope) { _parentComponentScope[exposeName] = $scope; }


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

        if (!_ignoredTextOverrides[text]) {
          // Check if the text has an override
          if (_textOverrides[text]) {
            options.ns = _textOverrides[text];
          } else if (TranslationOverrideService.hasOverride(options.ns, text)) {
            // The text has an override, now determine if it applies to this component
            for (var ancestor = $scope.parentComponent; ancestor !== null; ancestor = ancestor.parentComponent) {
              if (TranslationOverrideService.hasOverrideForNamespace(options.ns, text, ancestor.componentCName)) {
                options.ns = _textOverrides[text] = ancestor.componentCName;
                break;
              }
            }

            // If the namespace is still set to this component then mark as ignored
            if (options.ns === componentName) { _ignoredTextOverrides[text] = true; }
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
        return $timeout(noop);
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
          _cancelDigestUpdate = $scope.$watch(function() {
            _cancelDigestUpdate();
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
    var service = { init: wilsonComponentInit };

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
    var _config           = angular.wilson.config;
    var _cdnConfig        = _config.cdn;
    var _appMountPath     = _config.app.mountpath;
    var _appVersion       = _config.app.version || 'none';
    var _appHostUrl       = '';
    var _updateMillis     = _config.app.updateIntervalMillis || 1800000;
    var _componentCache   = {};
    var _lastUpdate       = Date.now();


    // Set the CDN host for loading components
    if (_cdnConfig && _cdnConfig.host && _cdnConfig.host !== 'false') {
      _appHostUrl = _cdnConfig.protocol + '://' + _cdnConfig.host;
      ResourceLoaderService.setResourceHost(_appHostUrl);
    }


    //   ____       _            _         __  __      _   _               _
    //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region private methods


    /**
     * Attempts to get the app version from the server
     *
     * @return promise
     */
    function getCurrentAppVersion() {
      return $http.get((_appMountPath + '/version'));
    }


    /**
     * Build a wilson component request url given a name and connectionFilters hash.
     * @param name
     * @param connectionFilters
     *
     * @returns String
     */
    function buildComponentUrl(name, connectionFilters) {
      return angular.wilson.utils.path.join(_appHostUrl, _appMountPath, _appVersion, 'component', name, (connectionFilters || ''));
    }


    /**
     * Fetches component dependency data from the server
     *
     * @param componentName
     * @return promise
     */
    function fetchComponentData(componentName) {
      // Build Component Request Url
      var componentUrl = buildComponentUrl(componentName, _config.app.connectionFilters);

      // Fetch component data from server
      return $http.get(componentUrl).then(function(response) {
        _lastUpdate = Date.now();
        return response.data;
      }, $q.reject);
    }

    // endregion


    //   ____        _     _ _        __  __      _   _               _
    //  |  _ \ _   _| |__ | (_) ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | | | | '_ \| | |/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |_| | |_) | | | (__  | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|    \__,_|_.__/|_|_|\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region public methods

    /**
     * Loads a component into the view.
     *
     * @param componentName
     */
    function loadComponent(componentName) {
      var cachedData  = _componentCache[componentName];

      // If component is not cached then fetch it 
      if (!cachedData) {

        return fetchComponentData(componentName).then(function(compData) {
          // If version matches, load resources
          if (_appVersion === compData.version) {
            return ResourceLoaderService.loadResourceBundle(compData).then(function() { return compData; }, $q.reject);
          }

          return $q.when(compData);
        }, $q.reject).then(function(compData) {
          // Cache and return the component data
          return (_componentCache[componentName] = compData);
        }, $q.reject);

      }
      
      // If its time for an update check, get check the server version to see if we are out-of-date
      if ((Date.now() - _lastUpdate) > _updateMillis) {
        // We haven't checked the server version in a while, make sure we are up to date
        return getCurrentAppVersion().then(function(versionInfo) {
          // If the server application is a different version than we do resolve as out-of-date
          if (versionInfo.version !== _appVersion) { return $q.when({ version: 'out-of-date' }); }

          // Update the last check time and return our cachedData
          _lastUpdate = Date.now();

          return cachedData;
        }, $q.reject);
      }

      // Otherwise, resolve the cache component data
      return $q.when(cachedData);
    }

    // endregion


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = { load: loadComponent };

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
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.prerender', []).provider('ComponentPrerenderService', ['$compileProvider', function($compileProvider) {

  // Mark prerender as incomplete
  window.prerenderReady = false;

  function noop() { }

  function prerenderLog(message) {
    var prerenderConfig = angular.wilson.config.prerender;

    if (prerenderConfig && prerenderConfig.enableLogs) { console.log(message); }
  }

  /**
   * Registers additional ngRepeat directive to track rendering status
   */
  function registerPrerenderNgRepeat() {
    $compileProvider.directive('ngRepeat', ['$timeout', function($timeout) {

      /**** Additional ngRepeat directive to track when the ngRepeat has finished populating the view ****/
      return {
        restrict: 'A',
        priority: -1,
        require: ['?ngRepeat', '^?WilsonComponent'],
        link: function($scope, $element, $attrs, ctrls) {
          //only do this is rendering has not completed
          if (!window.prerenderReady) {
            var cmpCtrl = ctrls[1];

            if ($scope.$first)  { cmpCtrl.registerViewDependency();         } // First rendered
            if ($scope.$last)   { cmpCtrl.deferredResolveViewDependency();  } // All rendered
          }
        }
      };
    }]);
  }

  //   ____                  _            ____        __ _       _ _   _
  //  / ___|  ___ _ ____   _(_) ___ ___  |  _ \  ___ / _(_)_ __ (_) |_(_) ___  _ __
  //  \___ \ / _ \ '__\ \ / / |/ __/ _ \ | | | |/ _ \ |_| | '_ \| | __| |/ _ \| '_ \
  //   ___) |  __/ |   \ V /| | (_|  __/ | |_| |  __/  _| | | | | | |_| | (_) | | | |
  //  |____/ \___|_|    \_/ |_|\___\___| |____/ \___|_| |_|_| |_|_|\__|_|\___/|_| |_|
  //
  // region service definition

  this.$get = ['$timeout', function($timeout) {


    /**
     * Adds functions needed for Prerender functionality
     *
     * @param $scope
     * @param controller
     */
    function addPrerenderMethods($scope, controller) {
      var viewDepCount            = 0;
      var pendingResolveDepCount  = 0;

      /**
       * Registers a new child view dependency for this component
       * @type {Function}
       */
      function registerViewDependency() { viewDepCount++; };

      /**
       * Immediately marks @count child view dependencies as resolved
       * @type {Function}
       */
      function resolveViewDependency(count) {
        count = count || 1;

        if (viewDepCount >= count)  { viewDepCount -= count; }
        else                        { prerenderLog('ERROR: Attempt to resolve more view deps than were added'); }

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
      }


      /**
       * Marks a child view dependencies as resolved but deffers the resolution to allow for $digest() and render cycles to complete
       *
       * @type {Function}
       */
      function deferredResolveViewDependency() {
        if (pendingResolveDepCount < 1) {
          pendingResolveDepCount++;
          $timeout(function () { $timeout(function () {
            controller.resolveViewDependency(pendingResolveDepCount);
            pendingResolveDepCount = 0;
          }); });
        } else {
          pendingResolveDepCount++;
        }
      }


      /**
       * Adds a deferred check to see if all view dependencies have been resolved for this component
       *
       * @type {Function}
       */
      function checkViewDependencies() {
        $timeout(function () { $timeout(function () {
          if (viewDepCount === 0 && $scope.parentComponent && $scope.parentComponent.componentCName) {
            $scope.parentComponent.resolveViewDependency();
          }
        }); });
      }

      /**
       * Register a data dependency that must be resolved before the view can render fully
       *
       * @param key             The $scope key for the data dependency (Ex: to track $scope.myValue => registerDataDependency('myValue'))
       * @param validationFunc  A function that returns true when the data is considered valid. Defaults to !_.isEmpty(value)
       */
      function registerDataDependency(key, validationFunc) {
        // Register view dependency
        controller.registerViewDependency();

        // Default validation function to !_.isEmpty()
        if (!validationFunc) {
          validationFunc = function (value) { return !_.isEmpty(value); }
        }

        // Add watch to key value
        var removeWatch = $scope.$watch(key, function (newValue) {
          if (validationFunc(newValue)) {
            removeWatch();
            controller.deferredResolveViewDependency();
          }
        });
      }

      
      // Component prerender functions
      var prerenderFunctions = {
        registerViewDependency:         registerViewDependency,
        registerDataDependency:         registerDataDependency,
        checkViewDependencies:          checkViewDependencies,
        resolveViewDependency:          resolveViewDependency,
        deferredResolveViewDependency:  deferredResolveViewDependency
      };

      //Add prerender functions to the $scope and controller
      _.merge($scope, prerenderFunctions);
      _.merge(controller, prerenderFunctions);
    }

    function deregisterPrerenderNgRepeat() { /* TODO: Figure out how to remove the extra ngRepeat directive */ }


    /**
     * Method to decorate on noop prerender functions to the $scope and controller references.
     *
     * @param $scope
     * @param controller
     */
    function addNoopPrerenderMethods($scope, controller) {
      // Component prerender functions
      var prerenderFunctions = {
        registerViewDependency:         noop,
        registerDataDependency:         noop,
        checkViewDependencies:          noop,
        resolveViewDependency:          noop,
        deferredResolveViewDependency:  noop
      };

      //Add prerender functions to the $scope and controller
      _.merge($scope, prerenderFunctions);
      _.merge(controller, prerenderFunctions);
    }


    // Default service (in case prerender is disabled)
    var service = { addPrerenderMethods: addNoopPrerenderMethods, deregisterPrerenderNgRepeat: noop };


    // If prerender is enabled, then set the proper service methods
    if (angular.wilson.config.prerender.enabled) {
      // Add additional ngRepeat directive for render tracking
      registerPrerenderNgRepeat();

      /************************************/
      /******** SERVICE INTERFACE *********/
      /************************************/
      service = {
        addPrerenderMethods:          addPrerenderMethods,
        deregisterPrerenderNgRepeat:  deregisterPrerenderNgRepeat
      };
    }

    return service;
  }];

  // endregion

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
   */
  function deprecateFunction(func, funcContext, deprecatedFuncName, newFuncName) {
    return function() {
      console.log('Warning: ' + deprecatedFuncName + '() is deprecated. Use ' + newFuncName + '() instead');
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
 * This service is used to dynamically load new scripts into the DOM and new templates into angular. Loaded scripts and
 * templates are cached and will not be subsequently loaded if they are already in the cache.
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

angular.wilson.service('ResourceLoaderService', ['$q', '$templateCache', function($q, $templateCache) {
    var _scriptCache    = {};
    var _templateCache  = {};
    var _appHostUrl     = '';

    // We are handling our own caching so set jQuery cache to true
    // Note: This is very important because otherwise ALL requests will re-hit the server
    $.ajaxSetup({ cache: true });


    /**
     * Set a URL to use as the base URL to load resources from
     * @param host
     */
    function setResourceHost(host) { _appHostUrl = host; }


    /**
     *
     * Loads a script for the given source url and calls the passed callback upon completion.
     *
     * @param src
     * @param callback
     *
     * @return promise
     */
    function loadScript(src) {
      var scriptUrl = angular.wilson.utils.path.join(_appHostUrl, src);

      // Immediately resolve if we have this script cached
      if (_scriptCache[src]) { return $q.when(); }

      // Create a new promise and attempt script load
      var deferred  = $q.defer();

      $.getScript(scriptUrl).done(function(script, textStatus) {
        // console.log('SUCCESS: ' + src + ' LOADED (' + textStatus + ')');
        _scriptCache[src] = true;  // Mark entry in cache for this script src
        deferred.resolve();
      }).fail(function(jqxhr, settings, exception) {
        console.log('ERROR: ' + src + ' FAILED TO LOAD');
        deferred.reject();
      });

      return deferred.promise;
    }


    /**
     *
     * Loads a template given an @id and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request. Returns true if the template was loaded, false if the template
     * already exists in the cache.
     *
     * @param id
     * @param data
     *
     */
    function loadTemplate(id, data) {
      // If the template is not cached, then register it into the Angular template cache
      if (!$templateCache[id]) {
        $templateCache.put(id, data);
        _templateCache[id] = { id: id };
      }
    }


    /**
     * Load a set of scripts asynchronously into the document. Returns a promise that is resolved
     * when all scripts have successfully loaded.
     *
     * @param scripts
     * @return promise
     */
    function loadResourceScripts(scripts) {
      // Load all of the new scripts in parallel
      var scriptPromises = [];
      _.each(scripts, function(script) { scriptPromises.push(loadScript(script)); });

      return $q.all(scriptPromises);
    }


    /**
     *
     * Loads a resource bundle of scripts and templates. Once all files have been loaded the given @callback
     * is fired. Template files are first loaded synchronously and sourced scripts are then loaded asynchronously. If
     * no new scripts or templates are found (i.e. if all scripts and templates already exist in the cache), then the
     * promise is immediately resolved.

     * @param resources
     *
     * @return promise
     */
    function loadResourceBundle(resources) {
      // Load any and all new templates
      _.each(resources.templates, function(template) { loadTemplate(template.id, template.data); });

      // Load any and all scripts
      return loadResourceScripts(resources.scripts);
    }


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = {
      setResourceHost:      setResourceHost,
      loadResourceScripts:  loadResourceScripts,
      loadResourceBundle:   loadResourceBundle
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

  // Global Dictionary of override translations for fast lookup
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
  function addOverride(nsToOverride, overridingNs, textKey) {
    var nsOverrides = translationOverrides[nsToOverride];

    // Create a dictionary for 'nsToOverride' if there are overrides
    if (!nsOverrides) { nsOverrides = translationOverrides[nsToOverride] = {}; }

    // Create an entry for the 'textKey' in 'nsToOverride' if it exists
    var textKeyEntry = nsOverrides[textKey];
    if (!textKeyEntry) { textKeyEntry = nsOverrides[textKey] = {}; }

    // Mark the textKey as having an override for 'overridingNs' if there is an override
    var overridingNsEntry = textKeyEntry[overridingNs];
    if (!overridingNsEntry) { textKeyEntry[overridingNs] = true; }
  }

  /**
   * Returns true if namespace @ns has ANY overrides for @textKey
   *
   * @param ns
   * @param textKey
   * @returns {boolean}
   */
  function hasOverride(ns, textKey) {
    return (translationOverrides[ns] && translationOverrides[ns][textKey]);
  }

  /**
   * Returns true if namespace @ns has an override for @textKey in @overridingNs
   *
   * @param ns
   * @param textKey
   * @param overridingNs
   * @returns {boolean}
   */
  function hasOverrideForNamespace(ns, textKey, overridingNs) {
    return (translationOverrides[ns] &&
            translationOverrides[ns][textKey] &&
            translationOverrides[ns][textKey][overridingNs]);
  }

  
  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    addOverride:              addOverride,
    hasOverride:              hasOverride,
    hasOverrideForNamespace:  hasOverrideForNamespace
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
  var _options = {};

  /**
   * Initialize the i18nextServiceProvider with a set of options.
   *
   * @public
   * @method init
   * @param o
   */
  this.init = function(o) {
    _options = _.extend(_options, o);

    window.i18next.init(_options);
  };


  /**
   * Returns a translate function for the given namespaces.
   *
   * @param namespace
   * @returns {Function}
   */
  function getTranslateForNamespace(namespace) {
    // Return a function that has a default namespace
    return function(text, options) {
      // Create a default callback if needed
      options = options || {};

      // Default namespace is component name
      if (typeof options.ns !== 'string' || options.ns === '') { options.ns = namespace; }

      //use the i18n provider to translate the text
      return window.i18next.t(text, options);
    };
  }

  /**
   * Recurse through a key value set and call the handler on all primitive type values.
   */
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


  /**
   * Traverse through an object calling the handler for all primitive type values.
   */
  function traverse(object, handler) {
    // set default handler to an identity function
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

  /**
   * Get translation function that uses a given namespace to translate keys of the given jsonObject.
   * @param namespace
   * @returns {Function}
   */
  function getTranslateJsonForNamespace(namespace) {
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
  }


  //   ____                  _            ____        __ _       _ _   _
  //  / ___|  ___ _ ____   _(_) ___ ___  |  _ \  ___ / _(_)_ __ (_) |_(_) ___  _ __
  //  \___ \ / _ \ '__\ \ / / |/ __/ _ \ | | | |/ _ \ |_| | '_ \| | __| |/ _ \| '_ \
  //   ___) |  __/ |   \ V /| | (_|  __/ | |_| |  __/  _| | | | | | |_| | (_) | | | |
  //  |____/ \___|_|    \_/ |_|\___\___| |____/ \___|_| |_|_| |_|_|\__|_|\___/|_| |_|
  //
  // region service definition

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

      getSupportedLanguages:  function() { return _options.languageData ? _options.languageData : []; },
      getActiveLanguage:      function() { return _options.lng ? _options.lng : _options.fallbackLng; }
    };
  }];

  // endregion

});

/**
 * Array specific utilities
 *
 * @class ArrayUtils
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
  var spliceArray = wilson.utils.spliceArray = function spliceArray(origArray, start, replace, arrayToSplice) {
    var args = [start];
    if (arguments.length > 2) { args.push(replace); }
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    return Array.prototype.splice.apply(origArray, args);
  };


  /**
   * Replaces the contents of @origArray with the contents of @newArray
   *
   * @param origArray
   * @param newArray
   */
  wilson.utils.replaceArray = function replaceArray(origArray, newArray) {
    spliceArray(origArray, 0, origArray.length, newArray);
  };


  /**
   * Clears the contents of a given array.
   *
   * @param origArray
   */
  wilson.utils.clearArray = function clearArray(origArray) {
    spliceArray(origArray, 0, origArray.length);
  };


})(angular.wilson, _);
/**
 * Data specific utilities
 *
 * @class DataUtils
 *
 */
'use strict';

(function(wilson, _) {
  var SIZE_UNITS  = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var LOG_1024    = Math.log(1024);


  /**
   * Given a number of bytes returns a well formatted size with units
   *
   * @param bytes
   * @param decimalPoint
   * @returns {string}
   */
  wilson.utils.bytesToReadable = function bytesToReadable(bytes, decimalPoint) {
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
   * This function returns a RFC4122 v4 compliant UUID string.
   */
  /*jslint bitwise: true */
  wilson.utils.generateUUID = function generateUUID() {
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

  /**
   * Print a pretty-formatted stack trace into the console.
   */
  wilson.utils.printStackTrace = function printStackTrace() {
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
    console.log(stack);
  };

})(angular.wilson, _);

/**
 * Created by hunter.novak on 2/7/17.
 */

(function(wilson) {

  /*
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
   * in FIPS 180-2
   * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   * Distributed under the BSD License
   * See http://pajhome.org.uk/crypt/md5 for details.
   * Also http://anmar.eu.org/projects/jssha2/
   */

  /*
   * Configurable variables. You may need to tweak these to be compatible with
   * the server-side, but the defaults work in most cases.
   */
  var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
  var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */

  /*
   * These are the functions you'll usually want to call
   * They take string arguments and return either hex or base-64 encoded strings
   */
  function hex_sha256(s)    { return rstr2hex(rstr_sha256(str2rstr_utf8(s))); }
  function b64_sha256(s)    { return rstr2b64(rstr_sha256(str2rstr_utf8(s))); }
  function any_sha256(s, e) { return rstr2any(rstr_sha256(str2rstr_utf8(s)), e); }
  function hex_hmac_sha256(k, d)
  { return rstr2hex(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
  function b64_hmac_sha256(k, d)
  { return rstr2b64(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
  function any_hmac_sha256(k, d, e)
  { return rstr2any(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

  /*
   * Perform a simple self-test to see if the VM is working
   */
  function sha256_vm_test()
  {
    return hex_sha256("abc").toLowerCase() ==
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  }

  /*
   * Calculate the sha256 of a raw string
   */
  function rstr_sha256(s)
  {
    return binb2rstr(binb_sha256(rstr2binb(s), s.length * 8));
  }

  /*
   * Calculate the HMAC-sha256 of a key and some data (raw strings)
   */
  function rstr_hmac_sha256(key, data)
  {
    var bkey = rstr2binb(key);
    if(bkey.length > 16) bkey = binb_sha256(bkey, key.length * 8);

    var ipad = Array(16), opad = Array(16);
    for(var i = 0; i < 16; i++)
    {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = binb_sha256(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
    return binb2rstr(binb_sha256(opad.concat(hash), 512 + 256));
  }

  /*
   * Convert a raw string to a hex string
   */
  function rstr2hex(input)
  {
    try { hexcase } catch(e) { hexcase=0; }
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    var x;
    for(var i = 0; i < input.length; i++)
    {
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F)
        +  hex_tab.charAt( x        & 0x0F);
    }
    return output;
  }

  /*
   * Convert a raw string to a base-64 string
   */
  function rstr2b64(input)
  {
    try { b64pad } catch(e) { b64pad=''; }
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var len = input.length;
    for(var i = 0; i < len; i += 3)
    {
      var triplet = (input.charCodeAt(i) << 16)
        | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
        | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
      for(var j = 0; j < 4; j++)
      {
        if(i * 8 + j * 6 > input.length * 8) output += b64pad;
        else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
      }
    }
    return output;
  }

  /*
   * Convert a raw string to an arbitrary string encoding
   */
  function rstr2any(input, encoding)
  {
    var divisor = encoding.length;
    var remainders = Array();
    var i, q, x, quotient;

    /* Convert to an array of 16-bit big-endian values, forming the dividend */
    var dividend = Array(Math.ceil(input.length / 2));
    for(i = 0; i < dividend.length; i++)
    {
      dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
    }

    /*
     * Repeatedly perform a long division. The binary array forms the dividend,
     * the length of the encoding is the divisor. Once computed, the quotient
     * forms the dividend for the next step. We stop when the dividend is zero.
     * All remainders are stored for later use.
     */
    while(dividend.length > 0)
    {
      quotient = Array();
      x = 0;
      for(i = 0; i < dividend.length; i++)
      {
        x = (x << 16) + dividend[i];
        q = Math.floor(x / divisor);
        x -= q * divisor;
        if(quotient.length > 0 || q > 0)
          quotient[quotient.length] = q;
      }
      remainders[remainders.length] = x;
      dividend = quotient;
    }

    /* Convert the remainders to the output string */
    var output = "";
    for(i = remainders.length - 1; i >= 0; i--)
      output += encoding.charAt(remainders[i]);

    /* Append leading zero equivalents */
    var full_length = Math.ceil(input.length * 8 /
      (Math.log(encoding.length) / Math.log(2)))
    for(i = output.length; i < full_length; i++)
      output = encoding[0] + output;

    return output;
  }

  /*
   * Encode a string as utf-8.
   * For efficiency, this assumes the input is valid utf-16.
   */
  function str2rstr_utf8(input)
  {
    var output = "";
    var i = -1;
    var x, y;

    while(++i < input.length)
    {
      /* Decode utf-16 surrogate pairs */
      x = input.charCodeAt(i);
      y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
      {
        x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
        i++;
      }

      /* Encode output as utf-8 */
      if(x <= 0x7F)
        output += String.fromCharCode(x);
      else if(x <= 0x7FF)
        output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
          0x80 | ( x         & 0x3F));
      else if(x <= 0xFFFF)
        output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
          0x80 | ((x >>> 6 ) & 0x3F),
          0x80 | ( x         & 0x3F));
      else if(x <= 0x1FFFFF)
        output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
          0x80 | ((x >>> 12) & 0x3F),
          0x80 | ((x >>> 6 ) & 0x3F),
          0x80 | ( x         & 0x3F));
    }
    return output;
  }

  /*
   * Encode a string as utf-16
   */
  function str2rstr_utf16le(input)
  {
    var output = "";
    for(var i = 0; i < input.length; i++)
      output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
        (input.charCodeAt(i) >>> 8) & 0xFF);
    return output;
  }

  function str2rstr_utf16be(input)
  {
    var output = "";
    for(var i = 0; i < input.length; i++)
      output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
        input.charCodeAt(i)        & 0xFF);
    return output;
  }

  /*
   * Convert a raw string to an array of big-endian words
   * Characters >255 have their high-byte silently ignored.
   */
  function rstr2binb(input)
  {
    var output = Array(input.length >> 2);
    for(var i = 0; i < output.length; i++)
      output[i] = 0;
    for(var i = 0; i < input.length * 8; i += 8)
      output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
    return output;
  }

  /*
   * Convert an array of big-endian words to a string
   */
  function binb2rstr(input)
  {
    var output = "";
    for(var i = 0; i < input.length * 32; i += 8)
      output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
    return output;
  }

  /*
   * Main sha256 function, with its support functions
   */
  function sha256_S (X, n) {return ( X >>> n ) | (X << (32 - n));}
  function sha256_R (X, n) {return ( X >>> n );}
  function sha256_Ch(x, y, z) {return ((x & y) ^ ((~x) & z));}
  function sha256_Maj(x, y, z) {return ((x & y) ^ (x & z) ^ (y & z));}
  function sha256_Sigma0256(x) {return (sha256_S(x, 2) ^ sha256_S(x, 13) ^ sha256_S(x, 22));}
  function sha256_Sigma1256(x) {return (sha256_S(x, 6) ^ sha256_S(x, 11) ^ sha256_S(x, 25));}
  function sha256_Gamma0256(x) {return (sha256_S(x, 7) ^ sha256_S(x, 18) ^ sha256_R(x, 3));}
  function sha256_Gamma1256(x) {return (sha256_S(x, 17) ^ sha256_S(x, 19) ^ sha256_R(x, 10));}
  function sha256_Sigma0512(x) {return (sha256_S(x, 28) ^ sha256_S(x, 34) ^ sha256_S(x, 39));}
  function sha256_Sigma1512(x) {return (sha256_S(x, 14) ^ sha256_S(x, 18) ^ sha256_S(x, 41));}
  function sha256_Gamma0512(x) {return (sha256_S(x, 1)  ^ sha256_S(x, 8) ^ sha256_R(x, 7));}
  function sha256_Gamma1512(x) {return (sha256_S(x, 19) ^ sha256_S(x, 61) ^ sha256_R(x, 6));}

  var sha256_K = new Array
  (
    1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993,
    -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987,
    1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
    264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
    -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585,
    113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
    1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885,
    -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
    430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
    1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872,
    -1866530822, -1538233109, -1090935817, -965641998
  );

  function binb_sha256(m, l)
  {
    var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534,
      1359893119, -1694144372, 528734635, 1541459225);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h;
    var i, j, T1, T2;

    /* append padding */
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >> 9) << 4) + 15] = l;

    for(i = 0; i < m.length; i += 16)
    {
      a = HASH[0];
      b = HASH[1];
      c = HASH[2];
      d = HASH[3];
      e = HASH[4];
      f = HASH[5];
      g = HASH[6];
      h = HASH[7];

      for(j = 0; j < 64; j++)
      {
        if (j < 16) W[j] = m[j + i];
        else W[j] = safe_add(safe_add(safe_add(sha256_Gamma1256(W[j - 2]), W[j - 7]),
          sha256_Gamma0256(W[j - 15])), W[j - 16]);

        T1 = safe_add(safe_add(safe_add(safe_add(h, sha256_Sigma1256(e)), sha256_Ch(e, f, g)),
          sha256_K[j]), W[j]);
        T2 = safe_add(sha256_Sigma0256(a), sha256_Maj(a, b, c));
        h = g;
        g = f;
        f = e;
        e = safe_add(d, T1);
        d = c;
        c = b;
        b = a;
        a = safe_add(T1, T2);
      }

      HASH[0] = safe_add(a, HASH[0]);
      HASH[1] = safe_add(b, HASH[1]);
      HASH[2] = safe_add(c, HASH[2]);
      HASH[3] = safe_add(d, HASH[3]);
      HASH[4] = safe_add(e, HASH[4]);
      HASH[5] = safe_add(f, HASH[5]);
      HASH[6] = safe_add(g, HASH[6]);
      HASH[7] = safe_add(h, HASH[7]);
    }
    return HASH;
  }

  function safe_add (x, y)
  {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  // Add sha1 hashing utilities to wilson
  wilson.utils.sha256Hex = hex_sha256;
  wilson.utils.sha256B64 = b64_sha256;

})(angular.wilson);
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
 * Created by hunter.novak on 2/7/17.
 */
'use strict';

(function(wilson) {

  // Base url to post message from
  var baseUrl   = window.location.protocol + '://' + window.location.host + (window.location.port ? (':' + window.location.port) : '');
  var debugCode = 'dXEJzIHqT/AqGDIn50KRRT4/t5tJP8V0YHw8il0IzS8';

  function infoConsole(message, data, trace)   { console.info(message, data, trace);  }
  function logConsole(message, data, trace)    { console.log(message, data, trace);   }
  function warnConsole(message, data, trace)   { console.warn(message, data, trace);  }
  function errorConsole(message, data, trace)  { console.error(message, data, trace); }

  function infoPostMsg(message, data, trace)   { window.postMessage({ type: 'log-message', level: 'info',   message: message, data: data, trace: trace }, baseUrl);  }
  function logPostMsg(message, data, trace)    { window.postMessage({ type: 'log-message', level: 'log',    message: message, data: data, trace: trace }, baseUrl);  }
  function warnPostMsg(message, data, trace)   { window.postMessage({ type: 'log-message', level: 'warn',   message: message, data: data, trace: trace }, baseUrl);  }
  function errorPostMsg(message, data, trace)  { window.postMessage({ type: 'log-message', level: 'error',  message: message, data: data, trace: trace }, baseUrl);  }

  // Setup Logger
  function WilsonLogger() {
    if (!(this instanceof WilsonLogger)) { return new WilsonLogger(); }

    this.info     = infoConsole;
    this.log      = logConsole;
    this.warn     = warnConsole;
    this.error    = errorConsole;

    this.enableDebugLogging = function enableDebugLogging(accessCode) {
      if (wilson.utils.sha256B64(accessCode) === debugCode) {
        this.info   = infoPostMsg;
        this.log    = logPostMsg;
        this.warn   = warnPostMsg;
        this.error  = errorPostMsg;
      }
    };

    this.disableDebugLogging = function disableDebugLogging() {
      this.info   = infoConsole;
      this.log    = logConsole;
      this.warn   = warnConsole;
      this.error  = errorConsole;
    };

  }

  wilson.logger = new WilsonLogger();

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
  var clearObject = wilson.utils.clearObject = function clearObject(object) {
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
  wilson.utils.replaceObject = function replaceObject(object, newObject) {
    clearObject(object);
    _.extend(object, newObject);
  }


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @param obj
   * @param path
   */
  wilson.utils.getPropFromPath = function getPropFromPath(obj, path) {
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
   * @param obj
   * @param path
   * @param value
   */
  wilson.utils.setPropFromPath = function setPropFromPath(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        if (typeof objRef[keys[i]] === 'undefined' || objRef[keys[i]] === null) {
          objRef[keys[i]] = {};
        }

        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') {
      objRef[targetKey] = value;
    }
  };

})(angular.wilson, _);
/**
 * Type specific utilities
 *
 * @class TypeUtils
 *
 */
'use strict';

(function(wilson, _) {

  /**
   * Parse given value into a boolean. Handles string values for falsey types.
   *
   * @param val
   * @return boolean
   */
  wilson.utils.parseBoolean = function parseBoolean(val) {
    var value = String(val).toLowerCase();

    switch (value) {
      case 'false':
      case 'nan':
      case 'undefined':
      case 'null':
      case '0':
      case '':
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

  // Define path namespace
  wilson.utils.path = {};

  /**
   * Joins string arguments into a '/' separated path.
   */
  wilson.utils.path.join = function joinPath() {
    var pathParts = _.toArray(arguments);

    if (!pathParts)             { return null; }
    if (pathParts.length === 1) { return pathParts[0]; }
    

    function getTrimMethod(index, length) {
      if (index === 0)            { return _.trimEnd;   }
      if (index === (length - 1)) { return _.trimStart; }

      return _.trim;
    }

    var trimmedParts = [];
    for (var i = 0; i < pathParts.length; i++) {
      var trim = getTrimMethod(i, pathParts.length);
      trimmedParts.push(trim(pathParts[i], PATH_CHARS));
    }

    return trimmedParts.join('/');
  }

})(angular.wilson, _);