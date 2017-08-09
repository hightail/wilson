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

    var _instance               = this;
    var _module                 = module;
    var _appConfig              = null;
    var _cache                  = { components: {}, behaviors: {}, services: {}, filters: {} };

    var _compileProvider        = null;
    var _controllerProvider     = null;
    var _filterProvider         = null;
    var _provider               = null;
    var _activePage             = null;
    var _activeRouteInfo        = {};
    var _componentMap           = {};
    var _preloadQueue           = [];


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
     * Get component element markup tag
     */
    function getComponentTag(componentName) {
      var tagName =  _appConfig.app.selectors.component + '-' + _.kebabCase(componentName);
      return '<' + tagName + '></' + tagName + '>';
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


    /**
     * Create a specialized component controller. This specialized controller will instantiate a new component instance using
     * the ComponentFactoryService and register it with the wilson instance.
     *
     * @param name                - The name of this component (kebabCase, with no prefix -- the pure component name)
     * @param controller          - The controller definition for the component
     * @param config              - The entire component configuration object
     * @returns [string|Function] - A new controller definition that represents the specialized component controller
     */
    function createComponentController(name, controller, config) {
      return ['ComponentFactoryService', 'WilsonUtils', '$scope', '$element', '$attrs',
        function(ComponentFactoryService, WilsonUtils, $scope, $element, $attrs) {
          var parent        = _instance.getActiveComponent(_instance.findComponentId($element));
          var componentId   = WilsonUtils.generateUUID();

          // Decorate componentId onto $element reference
          $element.data('wilsonComponentId', componentId);

          // Instantiate the new component and register the returned component $scope with the wilson instance
          _componentMap[componentId] = ComponentFactoryService.create(componentId, name, controller, this, parent, $scope, $element, $attrs, config);

          // Listen for component destroy to de-register
          $scope.on.event('$destroy', function() { delete _componentMap[componentId]; });
        }
      ];
    }


    /**
     * Validate and declare a given set of routes onto the given routeProvider instance. Facilitates all route setup
     * for a given set of configured application routes.
     *
     * @param routes          - A collection of route objects
     * @param routeProvider   - The angular routeProvider instance on which to declare the routes
     */
    function defineAppRoutes(routes, routeProvider) {
      // Enforce null route
      var nullRouteIdx = _.findIndex(routes, { path: null });

      if (nullRouteIdx === -1)              { throw new Error('Null route MUST be specified in routes!');       }
      if (nullRouteIdx < routes.length - 1) { throw new Error('Null route MUST be the last specified route!');  }

      // Define Application URL Routes
      _.each(routes, function(routeInfo) { createRoute(routeInfo, routes, routeProvider); });
    }


    /**
     * Get all configured route options associated with a given matched route path. Given a path and the complete
     * set of routes, return a cloned copy of the configured options for the route matching the specified path.
     *
     * @param matchedPath   - The path of the route
     * @param routes        - The collection of route objects to search
     * @returns {Object}    - A copy of the route options for the route that matches the given path (empty object if no match found)
     */
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

      // Create routing data for this route
      var routingData = {
        controller:     function() { _activePage = routeInfo.component; },
        template:       getComponentTag(routeInfo.component),
        componentName:  routeInfo.component,
        resolve: {
          title:      ['$rootScope', 'WilsonRouter', function($rootScope, WilsonRouter) {
            _.merge($rootScope, { page: { title: WilsonRouter.getTitleText(routeInfo.title) } });
            return $rootScope.page.title;
          }],
          component:  ['$route', '$q', '$location', '$window', 'WilsonRouter', 'WilsonUtils', 'ComponentLoaderService',
            function($route, $q, $location, $window, WilsonRouter, WilsonUtils, ComponentLoaderService) {
              var currentRoute  = $location.path();
              var options       = getRouteOptions($route.current.originalPath, routes);
              var activeInfo    = _.extend({}, options, routeInfo.defaultParams || {}, $route.current.params);
              
              // Set Active Route Info
              WilsonUtils.replaceObject(_activeRouteInfo, activeInfo);

              // Handle special routing functionality via IRouteService
              return WilsonRouter.handleRouteChange(currentRoute, options, routeInfo).then(function() {
                // Load the route component
                return ComponentLoaderService.load(routeInfo.component);
              }).then(function(data) {
                // Force a reload to update if out of date component
                if (data.version !== angular.wilson.config.app.version) { $window.location.reload(); }
                return data;
              }).catch(function(error) { return $q.reject(error); });
            }
          ],
          dependencies: ['$q', 'WilsonRouter', function($q, WilsonRouter) {
            var promises = [];

            // Call load dependencies on IRouteService if exposed (this method should return a $q promise)
            promises.push(WilsonRouter.loadDependencies(routeInfo));
            promises.push(WilsonRouter.loadSession());

            return $q.allSettled(promises);
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


    /***** Public config property *****/
    this.config = _appConfig;


    /***** Public routeInfo virtual property *****/
    Object.defineProperty(this, 'routeInfo', {
      get: function() { return _.cloneDeep(_activeRouteInfo); }
    });


    /**
     * Sets the app config object.
     *
     * @param config - Object to be set as the new _appConfig
     */
    this.setAppConfig = function setAppConfig(config) { this.config = _appConfig = config; };


    /**
     * Get the currently active page name
     */
    this.getActivePage = function getActivePage() { return _activePage; };


    /**
     * Get a currently active component by componentId
     */
    this.getActiveComponent = function getActiveComponent(componentId) { return _componentMap[componentId]; };


    /**
     * Get an info string of components that are available.
     */
    this.getActiveComponentList = function getActiveComponentList() {
      return _.map(_componentMap, function(component) { return component });
    };


    /**
     * Get the containing componentId for the given jQuery DOM element reference
     */
    this.findComponentId = function findComponentId(jqElement) {
      if (!jqElement || !jqElement.length) { return null; }     // If no element provided, then null

      // Return the componentId or the recursively found value
      return jqElement.data().wilsonComponentId || this.findComponentId(jqElement.parent());
    };


    /**
     * Destroy an active component
     */
    this.destroyComponent = function destroyComponent(componentId) {
      var component = this.getActiveComponent(componentId);

      // Remove the component if it exists
      if (component) { component.scope.$destroy(); }
    };


    /**
     * Declare special route handler service on Angular.
     *
     * @param definition  - Array or Function definition of the service
     */
    this.router = function defineRouter(definition) { this.service('WilsonRouteService', definition); };


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
      if (!_appConfig) { return _preloadQueue.push({ type: 'component', args: arguments }); }

      var directiveName = getDirectiveName(_appConfig.app.selectors.component, name);

      if (!_cache.components[directiveName]) {

        // Initialize the config with defaults
        var fullConfig = {
          restrict:       'EA',
          templateUrl:    name.toLowerCase(),
          replace:        true,
          scope:          {}
        };

        // Extend default parameters
        _.extend(fullConfig, config);

        // Validate Component Definition
        validateDefinition('component', name, fullConfig.controller);

        // Build and set controller and link method -- passing the original controller and link
        fullConfig.controller = createComponentController(name, fullConfig.controller, fullConfig);

        // Create a new directive for the component
        var provider = _compileProvider || _module;
        provider.directive(directiveName, function() { return fullConfig; });

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
      if (!_appConfig) { return _preloadQueue.push({ type: 'behavior', args: arguments }); }

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

        // Disable Class/Comment and Debug Info for Performance
        _compileProvider.commentDirectivesEnabled(false);
        _compileProvider.cssClassDirectivesEnabled(false);
        _compileProvider.debugInfoEnabled(config.debugInfoEnabled);

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
    _module.run(['$rootScope', '$templateCache', '$location', '$timeout', 'WilsonUtils', 'WilsonLogger',
      function wilsonRun($rootScope, $templateCache, $location, $timeout, WilsonUtils, WilsonLogger) {

        // Local No Operation Function
        var noop = function() {};

        // Decorate utilities and logger onto this wilson instance
        _instance.utils = WilsonUtils;
        _instance.log   = WilsonLogger;


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
        $rootScope.triggerDigest = function rootTriggerDigest() { return $timeout(noop); };


        /**
         * Method to bind a given function and context to run and then trigger an angular digest cycle.
         *
         * @param method
         * @param context
         * @returns {*}
         */
        $rootScope.bindToDigest = function rootBindToDigest(method, context) {
          context = context || this;

          var bound = function() {
            method.apply(context, arguments);
            $rootScope.triggerDigest();
          };

          return method ? bound : noop;
        };

        // endregion


        // Declare any pre-loaded items on this wilson instance
        _.each(_preloadQueue, function(item) { _instance[item.type].apply(_instance, item.args); });
      }
    ]);

    // endregion

  }

  // endregion



  /**
   * Wilson Angular Module Declaration and Framework Instantiation
   */
  var wilsonModule  = angular.module('wilson', ['ngRoute', 'LocalStorageModule', 'wilson.config', 'wilson.router', 'wilson.i18n', 'wilson.utils', 'wilson.decorators', 'wilson.logger']);
  var wilson        = new Wilson(wilsonModule);

  // Set Global window and angular instance references
  angular.wilson = window.wilson = wilson;

})(this, angular, _);
