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
     * Create a specialized behavior definition. This specialized definition will create a wrapping link method around
     * the original link that can extend/decorate the $scope if needed. Currently this method simply decorates a
     * WilsonEventHelper instance if this is not a component scope)
     *
     * @param definition                      - The original behavior definition
     * @returns {[string,string, Function]}   - The actual behavior definition that wraps the original
     */
    function createBehaviorDefinition(definition) {
      return ['$injector', 'WilsonEventHelper', function($injector, WilsonEventHelper) {
        var behaviorConfig  = $injector.invoke(definition);
        var originalLink    = behaviorConfig.link;
        var invokeTarget    = _.isArray(definition) ? definition[definition.length - 1] : definition;

        if (originalLink) {
          behaviorConfig.link = function($scope, $element, $attrs, controller) {
            if (!$scope.hasOwnProperty('on')) { $scope.on = new WilsonEventHelper($scope); }
            originalLink.apply(invokeTarget, [$scope, $element, $attrs, controller]);
          };
        }

        return behaviorConfig;
      }];
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
      if (component) { component.$destroy(); }
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
        provider.directive(directiveName, createBehaviorDefinition(definition));

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
    _module.run(['$rootScope', '$templateCache', '$location', '$timeout', 'WilsonUtils', 'WilsonLogger', 'ComponentLoaderService',
      function wilsonRun($rootScope, $templateCache, $location, $timeout, WilsonUtils, WilsonLogger, ComponentLoaderService) {

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


        //   ____           _                 _ _
        //  |  _ \ _ __ ___| | ___   __ _  __| (_)_ __   __ _
        //  | |_) | '__/ _ \ |/ _ \ / _` |/ _` | | '_ \ / _` |
        //  |  __/| | |  __/ | (_) | (_| | (_| | | | | | (_| |
        //  |_|   |_|  \___|_|\___/ \__,_|\__,_|_|_| |_|\__, |
        //                                              |___/
        // region preloading

        // Declare any pre-loaded items on this wilson instance
        _.each(_preloadQueue, function(item) { _instance[item.type].apply(_instance, item.args); });

        // Preload any marked route components
        var cleanup = $rootScope.$on('$locationChangeSuccess', function() {
          var loaded = {};
          _.each(_instance.config.routes, function(route) {
            if (route.preload && !loaded[route.component]) {
              loaded[route.component] = ComponentLoaderService.load(route.component);
            }
          });

          cleanup();  // Remove this one-time handling operation
        });

        // endregion

      }
    ]);

    // endregion

  }

  // endregion



  /**
   * Wilson Angular Module Declaration and Framework Instantiation
   */
  var wilsonModule  = angular.module('wilson', ['ngRoute', 'LocalStorageModule', 'wilson.config', 'wilson.router', 'wilson.i18n', 'wilson.utils', 'wilson.decorators', 'wilson.logger', 'wilson.coreTemplates']);
  var wilson        = new Wilson(wilsonModule);

  // Set Global window and angular instance references
  angular.wilson = window.wilson = wilson;

})(this, angular, _);

/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonComponent', ['$rootScope', '$timeout', 'WilsonEventHelper', 'WilsonStorageHelper', 'StateMachineService', 'i18nextService',
  function($rootScope, $timeout, WilsonEventHelper, WilsonStorageHelper, StateMachineService, i18nextService) {

    // Stored NOOP
    function noop() {}


    //    ____                _                   _
    //   / ___|___  _ __  ___| |_ _ __ _   _  ___| |_ ___  _ __
    //  | |   / _ \| '_ \/ __| __| '__| | | |/ __| __/ _ \| '__|
    //  | |__| (_) | | | \__ \ |_| |  | |_| | (__| || (_) | |
    //   \____\___/|_| |_|___/\__|_|   \__,_|\___|\__\___/|_|
    //
    //

    function WilsonComponent(id, name, scope) {
      this.scope      = scope;
      this.component  = Object.freeze({ id: id, name: name });
      this.on         = new WilsonEventHelper(scope);
      this.storage    = new WilsonStorageHelper(name);
    }


    //    ____ _                 __  __      _   _               _
    //   / ___| | __ _ ___ ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |   | |/ _` / __/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  | |___| | (_| \__ \__ \ | |  | |  __/ |_| | | | (_) | (_| \__ \
    //   \____|_|\__,_|___/___/ |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    //region class methods

    /**
     * Method to trigger a digest to re-render the view.
     */
    WilsonComponent.prototype.triggerDigest = function triggerDigest() {
      return $timeout(noop);
    };


    /**
     * Method to bind a function to run and trigger a digest
     */
    WilsonComponent.prototype.bindToDigest = function bindToDigest(method, context) {
      var me  = this;
      context = context || this;

      var bound = function() {
        method.apply(context, arguments);
        me.scope.triggerDigest();
      };

      return method ? bound : noop;
    };


    /**
     * Sets @scopePropertyName on $scope to @defaultValue if it is not already set
     *
     * @param scopePropertyName
     * @param defaultValue
     * @returns {*}
     */
    WilsonComponent.prototype.defaultValue = function defaultValue(scopePropertyName, defaultVal) {
      var value = this.scope[scopePropertyName];
      if (_.isUndefined(value) || _.isNull(value)) {
        this.scope[scopePropertyName] = defaultVal;
      }

      return this.scope[scopePropertyName];
    };


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
     */
    WilsonComponent.prototype.stateMachine = function stateMachine(config) {
      if (config) { this.scope.state = StateMachineService.create(config); }
    };


    /**
     * Translates given text based on the set language.
     *
     * @public
     * @method translate
     * @for HtComponent
     * @param text        The text to translate
     * @param options     Translation options (e.g. { ns:'my-namespace', count: 1})
     *
     */
    WilsonComponent.prototype.translate = function translate(text, options) {
      // Create a default callback if needed
      options = options || {};

      // Default namespace is component name
      if (typeof options.ns !== 'string' || options.ns === '') { options.ns = this.component.name; }

      // Use the i18n provider to translate the text
      return i18nextService.translate(text, options);
    };

    // endregion


    return WilsonComponent;
  }
]);
/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonEventHelper', ['$timeout', 'WindowUnloadService', function($timeout, WindowUnloadService) {

  //    ____                _                   _
  //   / ___|___  _ __  ___| |_ _ __ _   _  ___| |_ ___  _ __
  //  | |   / _ \| '_ \/ __| __| '__| | | |/ __| __/ _ \| '__|
  //  | |__| (_) | | | \__ \ |_| |  | |_| | (__| || (_) | |
  //   \____\___/|_| |_|___/\__|_|   \__,_|\___|\__\___/|_|
  //
  //

  function WilsonEventHelper(scope) {
    this.scope = scope;
  }


  //    ____ _                 __  __      _   _               _
  //   / ___| | __ _ ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |   | |/ _` / __/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  | |___| | (_| \__ \__ \ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //   \____|_|\__,_|___/___/ |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  //region class methods

  /**
   * Adds to @handler $on @eventName and automatically
   * removes when the Component is destroyed
   *
   * @param signal
   * @param handler
   */
  WilsonEventHelper.prototype.event = function event(eventName, handler) {
    var removeOnHandler = this.scope.$on(eventName, handler);
    var removeDestroy   = this.scope.$on('$destroy', function() {
      removeOnHandler();
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
  WilsonEventHelper.prototype.signal = function signal(sig, handler) {
    sig.add(handler);

    var removeDestroy = this.scope.$on('$destroy', function() {
      if (sig.has(handler)) {
        sig.remove(handler);
      }
      removeDestroy();
    });
  };


  /**
   * Sets a $watch that will automatically be removed when the $scope is $destroy'ed
   * @param key
   * @param watchHandler
   */
  WilsonEventHelper.prototype.watch = function watch(key, watchHandler) {
    //Add watch to key value
    var removeWatch   = this.scope.$watch(key, watchHandler);
    var removeDestroy = this.scope.$on('$destroy', function() {
      removeWatch();
      removeDestroy();
    });
  };


  /**
   * Adds a handler to be called after any completed angular digest cycle.
   *
   * @param handle
   */
  WilsonEventHelper.prototype.digest = function digest(handle) {
    var _cancelDigestUpdate = null;
    var me                  = this;

    // Function that will run after the digest
    function afterDigest(callback) {
      if (me.scope.$$destroyed) { return; }

      // Setup a watch to run once
      _cancelDigestUpdate = me.scope.$watch(function() {
        _cancelDigestUpdate();
        $timeout(function() {
          callback();
          afterDigest(callback);
        }, 0, false);
      });
    }

    afterDigest(handle);
  };


  /**
   * Adds a window unload handler to be called if the window is refreshed or attempts to navigate away from the
   * page.
   *
   * @param handle            - The handler function. This should return a string if nav should be confirmed.
   * @param includeLocalNav   - True if the handler should also be used for local navigation changes
   */
  WilsonEventHelper.prototype.pageUnload = function pageUnload(handle, includeLocalNav) {
    var removeHandler = WindowUnloadService.registerHandler(handle, includeLocalNav);
    var removeDestroy = this.scope.$on('$destroy', function() {
      removeHandler();
      removeDestroy();
    });
  };

  // endregion


  return WilsonEventHelper;

}]);
/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonStorageHelper', ['localStorageService', function(localStorageService) {


  //    ____                _                   _
  //   / ___|___  _ __  ___| |_ _ __ _   _  ___| |_ ___  _ __
  //  | |   / _ \| '_ \/ __| __| '__| | | |/ __| __/ _ \| '__|
  //  | |__| (_) | | | \__ \ |_| |  | |_| | (__| || (_) | |
  //   \____\___/|_| |_|___/\__|_|   \__,_|\___|\__\___/|_|
  //
  //

  function WilsonStorageHelper(namespace) {
    this.namespace = namespace;
  }


  //    ____ _                 __  __      _   _               _
  //   / ___| | __ _ ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |   | |/ _` / __/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  | |___| | (_| \__ \__ \ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //   \____|_|\__,_|___/___/ |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  //region class methods

  /**
   * Retrieves a value from this component's persistent storage (localStorage)
   *
   * @param key
   * @param defaultVal    The value to return if the @key is not found
   * @returns {*}
   */
  WilsonStorageHelper.prototype.get = function get(key, defaultVal) {
    var keyValue          = defaultVal;
    var localStorageValue = localStorageService.get(this.namespace);

    // If a key is provided then only return the key's value
    if (localStorageValue && key) { keyValue = localStorageValue[key]; }

    // If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) { keyValue = defaultVal; }

    return keyValue;
  };


  /**
   * Stores @key:@value for this component in localStorage
   *
   * @param keyValueHash
   * @returns {*}
   */
  WilsonStorageHelper.prototype.set = function set(key, value) {
    var state         = localStorageService.get(this.namespace) || {};
    var keyValueHash  = {};

    if (arguments.length > 1) { keyValueHash[key] = value;  }   // If 2 args set single value
    else                      { keyValueHash      = key;    }   // If 1 arg treat as hash

    // Save changes and extend the current values with the new ones
    localStorageService.add(this.namespace,  _.extend(state, keyValueHash));

    return state;
  };


  // endregion


  return WilsonStorageHelper;

}]);
/**
 * This service provides base class extension and default functionality to component controllers.
 *
 * @class ComponentFactoryService
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('ComponentFactoryService', ['$rootScope', '$timeout', '$injector', 'WilsonComponent', 'ResourceLoaderService',
  function($rootScope, $timeout, $injector, WilsonComponent, ResourceLoaderService) {
    
    /**
     * Initializes a Component Controller
     *
     * @method createComponent
     *
     * @param componentId   The id of the component
     * @param componentName The name of the component
     * @param controller    The controller definition to invoke
     * @param context       The controller context to use when invoking and instantiating this component controller
     * @param parentScope   Reference to the parent component $scope
     * @param $scope        Reference to the components $scope
     * @param $element      Reference to the components $element
     * @param $attrs        Reference to the components $attrs
     * @param config        The original component configuration
     *
     * @return IScope       The decorated component scope object
     */
    function createComponent(componentId, componentName, controller, context, parentScope, $scope, $element, $attrs, config) {

      // Create component class instance
      var _instance         = new WilsonComponent(componentId, componentName, $scope);

      /***** Scope Decorations *****/

      $scope.component      = _instance.component;
      $scope.state          = { current: null };  // Default state

      // Forward WilsonComponent instance prototype methods onto the scope
      $scope.translate      = _instance.translate.bind(_instance);
      $scope.defaultValue   = _instance.defaultValue.bind(_instance);
      $scope.triggerDigest  = _instance.triggerDigest.bind(_instance);
      $scope.bindToDigest   = _instance.bindToDigest.bind(_instance);
      $scope.stateMachine   = _instance.stateMachine.bind(_instance);

      // Forward WilsonComponent special object references onto the scope
      $scope.on             = _instance.on;
      $scope.storage        = _instance.storage;

      // Add convenience method for root broadcasting. All scopes inherit from angular's base
      // scope class, so bind the rootScope context into this referenced method.
      $scope.$broadcastRoot = $scope.$broadcast.bind($rootScope);


      //  ___       _ _   _       _ _
      // |_ _|_ __ (_) |_(_) __ _| (_)_______
      //  | || '_ \| | __| |/ _` | | |_  / _ \
      //  | || | | | | |_| | (_| | | |/ /  __/
      // |___|_| |_|_|\__|_|\__,_|_|_/___\___|
      //
      // region initialize


      /***** Configure Pre-invocation functionality *****/

      // Parent interface forwarding
      _.forIn(config.inherit, function(construct, property) {
        if (!_.isUndefined(parentScope[property]))  { $scope[construct] = parentScope[property]; }
      });


      /***** Invoke the controller with appropriate locals *****/

      $injector.invoke(controller, context, { $scope: $scope, $element: $element, $attrs: $attrs });


      /***** Post invocation processing/decoration *****/

      // ATTRIBUTE: expose  - Used for exposing this components scope on the parent component
      var exposeName = $attrs ? $attrs.expose : false;
      if (exposeName && parentScope) {

        // If an exports definition exists, read it to create the publicly exported interface
        if (config.exports) {
          var exports = {};

          _.forIn(config.exports, function(construct, property) {
            if (_.isFunction($scope[construct])) {
              exports[property] = $scope[construct];
            } else {
              Object.defineProperty(exports, property, {
                get: function() { return $scope[construct]; }
              });
            }
          });

          parentScope[exposeName] = exports;

        } else {
          // DEPRECATED: Support old expose functionality temporarily
          parentScope[exposeName] = $scope;
        }
      }

      // Script Dependency Loading
      if (_.isArray(config.dependencies) && !_.isEmpty(config.dependencies)) {
        var relativePathRegex    = /^\/[^\/]/;
        var preparedDependencies = _.map(config.dependencies, function(dependency) {
          if (relativePathRegex.test(dependency) && wilson.config.app.useVersionedAssets) {
            return dependency.replace(wilson.config.app.assetPath, wilson.config.app.versionedAssetPath);
          }

          return dependency;
        });

        ResourceLoaderService.loadResourceScripts(preparedDependencies).then(
          function() { if (_.isFunction($scope.onDependenciesReady))  { $scope.onDependenciesReady.apply($scope, []); } },
          function() { if (_.isFunction($scope.onDependenciesError))  { $scope.onDependenciesError.apply($scope, []); } }
        );
      }

      // endregion

      return $scope;
    };

    // Service Object Definition
    var service = { create: createComponent };

    return service;
  }
]);

/**
 * ComponentLoader Service
 *
 * @class ComponentLoaderService
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('ComponentLoaderService', ['ResourceLoaderService', '$q', '$http',
  function(ResourceLoaderService, $q, $http) {

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
     * @return HttpPromise
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
      var cachedComponent  = _componentCache[componentName];

      // If component is not cached then fetch it and store its promise
      if (!cachedComponent) {
        cachedComponent = _componentCache[componentName] = {};

        return (cachedComponent.promise = fetchComponentData(componentName).then(function(compData) {
          // If version matches, load resources
          if (_appVersion === compData.version) {
            return ResourceLoaderService.loadResourceBundle(compData).then(function() { return compData; }, $q.reject);
          }

          return compData;
        }).then(function(compData) {
          // Cache and return the component data
          return (cachedComponent.data = compData);
        }).catch(function(e) {
          _componentCache[componentName] = null;
          return $q.reject(e);
        }));
      }

      // If the component is cached, but there is no data, return the promise
      if (!cachedComponent.data) { return cachedComponent.promise; }

      // If its time for an update check, get check the server version to see if we are out-of-date
      if ((Date.now() - _lastUpdate) > _updateMillis) {
        // We haven't checked the server version in a while, make sure we are up to date
        return getCurrentAppVersion().then(function(versionInfo) {
          // If the server application is a different version than we do resolve as out-of-date
          if (versionInfo.version !== _appVersion) { return $q.when({ version: 'out-of-date' }); }

          // Update the last check time and return our cachedComponent data
          _lastUpdate = Date.now();

          return cachedComponent.data;
        }, $q.reject);
      }

      // Otherwise, resolve the cache component data
      return $q.when(cachedComponent.data);
    }

    // endregion


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = { load: loadComponent };

    return service;
  }
]);

/**
 * This service is used to dynamically load new scripts into the DOM and new templates into angular. Loaded scripts and
 * templates are cached and will not be subsequently loaded if they are already in the cache.
 *
 * @class ResourceLoaderService
 * @module wilson
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('ResourceLoaderService', ['$q', '$templateCache', function($q, $templateCache) {
    var _scriptCache    = {};
    var _templateCache  = {};
    var _styleCache     = {};
    var _styleElem      = $('<div id="wilson-style-chunks"></div>').appendTo('body');
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
     *
     * @return Promise
     */
    function loadScript(src) {
      var scriptUrl = angular.wilson.utils.path.join(_appHostUrl, src);

      // Immediately resolve if we have this script cached
      if (_scriptCache[src]) { return $q.when(); }

      // Create a new promise and attempt script load
      var deferred  = $q.defer();

      $.getScript(scriptUrl).done(function(script, textStatus) {
        wilson.log.debug('SUCCESS: ' + src + ' LOADED (' + textStatus + ')');
        _scriptCache[src] = true;  // Mark entry in cache for this script src
        deferred.resolve();
      }).fail(function(jqxhr, settings, exception) {
        wilson.log.error('ERROR: ' + src + ' FAILED TO LOAD');
        deferred.reject();
      });

      return deferred.promise;
    }


    /**
     *
     * Loads a the styles for a given id and styleContent. Loading is synchronous because the content is simple
     * put into the document in a style block.
     *
     * @param id
     * @param styleContent
     */
    function loadStyles(id, styleContent) {
      if (!_styleCache[id]) {
        _styleElem.append('<style type="text/css" data-style-id="' + id + '">' + styleContent + '</style>');
        _styleCache[id] = true;  // Mark entry in cache for this script src
      }
    }


    /**
     *
     * Loads a template given an @id and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request.
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
     * @return Promise
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
     * @return Promise
     */
    function loadResourceBundle(resources) {
      // Load any and all new templates
      _.each(resources.templates, function(template) { loadTemplate(template.id, template.data); });

      // Load all new styles
      _.each(resources.styles, function(style) { loadStyles(style.id, style.data); });

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
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('StateMachineService', ['$timeout', function($timeout) {

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
    var states  = HtStateMachine.getStates(cfg);
    var events  = _.map(cfg.events, 'name');
    var vState  = {};

    // Forward event methods
    _.each(events, function(event) { vState[event] = fsm[event].bind(fsm); });

    // Create virtual getters for states
    _.each(states, function(state) {
      Object.defineProperty(vState, state, {
        get: function() { return fsm.is(state); }
      });
    });

    // Create virtual getter for current
    Object.defineProperty(vState, 'current', {
      get: function() { return fsm.current; }
    });

    return vState;
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
    states = _.uniq(_.without(states, '*'));

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
 * WindowUnload Service
 *
 * @class WindowUnloadService
 * @module wilson
 *
 * @author hunter.novak
 * @since 4.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('WindowUnloadService', ['$window', '$document', '$rootScope', function($window, $document, $rootScope) {

  var _disableUnloadHandling  = false;
  var _hasCompletedPrompt     = false;


  //   ____       _            _         __  __      _   _               _
  //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  // region private methods

  /**
   * Create a specialized window onbeforeunload handler that provides a controlled execution based on if unload handling
   * should be disabled.
   *
   * @param handler {Function} - The original handler to be wrapped.
   * @returns {Function}       - The new controlled handler definition
   */
  function createControlledHandler(handler) {
    return function() {
      if (!_disableUnloadHandling) {
        var prompt = handler();
        if (prompt) { return prompt; }
      }
    }
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
   * Registers a handler on the window.onbeforeunload event.  If the handler returns a string a confirmation message
   * is displayed to the user prior to unloading the window. If the includeLocalNavigation flag is set to true, then a
   * handler will also be placed on local navigation in the $locationChangeStart event.
   *
   * @param unloadHandler {Function}          - The handler function to run when the window starts unloading
   * @param includeLocalNavigation {boolean}  - True if the handler should also cover local navigation events
   *
   * @returns {Function}                      - Function that will destroy the attached handler
   */
  function registerHandler(unloadHandler, includeLocalNavigation) {
    var uniqueHandler = createControlledHandler(unloadHandler || function() {});
    var localCleanup  = null;

    // Set window handler
    $(window).on('beforeunload', uniqueHandler);

    // If local navigation is included, set a local handler
    if (includeLocalNavigation) {
      localCleanup = $rootScope.$on('$locationChangeStart', function locationChange(event) {
        if (!_hasCompletedPrompt) {
          var prompt = unloadHandler();
          if (prompt) {
            if (!$window.confirm(prompt)) { event.preventDefault();  }
            _hasCompletedPrompt = true;
          }
        }
      });
    }

    return function() {
      $(window).off('beforeunload', uniqueHandler);
      if (localCleanup) { localCleanup(); };
    };
  }

  // endregion



  //  ___       _ _   _       _ _
  // |_ _|_ __ (_) |_(_) __ _| (_)_______
  //  | || '_ \| | __| |/ _` | | |_  / _ \
  //  | || | | | | |_| | (_| | | |/ /  __/
  // |___|_| |_|_|\__|_|\__,_|_|_/___\___|
  //
  // region initialize

  // Initialize local nav handler
  $rootScope.$on('$locationChangeStart', function() { _hasCompletedPrompt = false; });

  // Handle Special Navigation Ignore cases
  $($document).on('click', 'a[href^=mailto]', function() {
    _disableUnloadHandling = true;

    var disabledHandler = function() {
      _disableUnloadHandling = false;
      $(window).off('beforeunload', disabledHandler);
    };

    $(window).on('beforeunload', disabledHandler)
  });

  // endregion


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    registerHandler:  registerHandler
  };

  return service;
}]);

/**
 * Module to provide decorations onto commonly shared libraries.
 *
 * All decorations are declared onto the provider in the module's config block below.
 *
 * @module wilson
 * @submodule wilson.decorators
 *
 * @author michael.chen
 * @since 1.0.1
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
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
 * Module that provides i18n support.
 *
 * The module is declared with an accompanying service for facilitating
 * i18n functionality.
 *
 * @module wilson
 * @submodule wilson.i18n
 *
 * @author dan.nguyen
 * @author hunter.novak (updates)
 * @since 0.0.1
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
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
 * Module that provides logging functions.
 *
 * The module is declared with an accompanying service that provides logging functionality.
 *
 * @module wilson
 * @submodule wilson.logger
 *
 * @author hunter.novak
 * @since 3.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.logger', []).provider('WilsonLogger', function() {

  var LOG_LEVELS = [
    Object.freeze({ name: 'FATAL', console: fatalConsole }),
    Object.freeze({ name: 'ERROR', console: errorConsole }),
    Object.freeze({ name: 'WARN',  console: warnConsole  }),
    Object.freeze({ name: 'INFO',  console: infoConsole  }),
    Object.freeze({ name: 'DEBUG', console: debugConsole }),
    Object.freeze({ name: 'TRACE', console: traceConsole })
  ];

  var _logMethods     = {};
  var _noop           = function() {};

  function traceConsole()  { console.trace.apply(this, arguments);   }
  function debugConsole()  { console.debug.apply(this, arguments);   }
  function infoConsole()   { console.info.apply(this, arguments);    }
  function warnConsole()   { console.warn.apply(this, arguments);    }
  function errorConsole()  { console.error.apply(this, arguments);   }
  function fatalConsole()  { console.error.apply(this, arguments);   }

  function setLevel(logLevel) {
    // Clear existing log methods to no operation functions
    _.forIn(LOG_LEVELS, function(level) { _logMethods[level.name.toLowerCase()] = _noop; });

    // Try to find our logLevel
    var levelIndex = logLevel === 'ALL' ? (LOG_LEVELS.length - 1) : _.findIndex(LOG_LEVELS, { name: logLevel });

    // If no log level of this name found, then exit here (effectively turning off logging)
    if (!levelIndex) { return; }

    // Now assign each relevant logging up to this level
    for (var i = 0; i <= levelIndex; i++) { _logMethods[LOG_LEVELS[i].name.toLowerCase()] = LOG_LEVELS[i].console; }
  }

  // Initialize to OFF
  setLevel();

  // WilsonLogger Definition
  this.$get = [function() {
    return Object.freeze({
      setLevel:  setLevel,

      trace: function() { _logMethods.trace.apply(this, arguments);  },
      debug: function() { _logMethods.debug.apply(this, arguments);  },
      info:  function() { _logMethods.info.apply(this, arguments);   },
      warn:  function() { _logMethods.warn.apply(this, arguments);   },
      error: function() { _logMethods.error.apply(this, arguments);  },
      fatal: function() { _logMethods.fatal.apply(this, arguments);  }
    });
  }];

});
/**
 * Module that provides a special routing interface.
 *
 * The module provides default route handling functionality and allows implementation of a WilsonRoutingService that
 * can be implemented to extend special route handling for an application.
 *
 * @module wilson
 * @submodule wilson.router
 *
 * @author hunter.novak
 * @since 4.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.router', []).provider('WilsonRouter', function() {

  // WilsonRouter Definition
  this.$get = ['$q', '$injector', function($q, $injector) {

    // Optional Extended Service Implementation
    var _extendedService = {};

    // Default Service Implementation
    var _defaultService  = {
      handleRouteChange:  function() { return $q.when();  },
      loadDependencies:   function() { return $q.when();  },
      loadSession:        function() { return $q.when();  },
      getTitleText:       function(routeTitle) { return routeTitle; }
    };

    // Attempt to load implemented Routing Service
    try { _extendedService = $injector.get('WilsonRouteService'); } catch(e) {}

    // Create final extended routeService
    var _routeService = _.merge({}, _defaultService, _extendedService || {});


    return Object.freeze({
      handleRouteChange:  _routeService.handleRouteChange,
      loadDependencies:   _routeService.loadDependencies,
      loadSession:        _routeService.loadSession,
      getTitleText:       _routeService.getTitleText
    });
  }];

});
/**
 * Module that provides utility functions.
 *
 * The module is declared with an accompanying service that provides all supported
 * utility functions.
 *
 * @module wilson
 * @submodule wilson.utils
 *
 * @author hunter.novak
 * @since 3.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.utils', []).provider('WilsonUtils', function() {


  // Constants
  var SIZE_UNITS  = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var LOG_1024    = Math.log(1024);
  var PATH_CHARS  = ' /';


  //      _                           _   _ _   _ _
  //     / \   _ __ _ __ __ _ _   _  | | | | |_(_) |___
  //    / _ \ | '__| '__/ _` | | | | | | | | __| | / __|
  //   / ___ \| |  | | | (_| | |_| | | |_| | |_| | \__ \
  //  /_/   \_\_|  |_|  \__,_|\__, |  \___/ \__|_|_|___/
  //                          |___/
  //
  // region array utils

  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start Start index
   * @param replace Number of elements to remove
   * @param arrayToSplice Optional array to append
   */
  function spliceArray(origArray, start, replace, arrayToSplice) {
    var args = [start];
    if (arguments.length > 2) { args.push(replace); }
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    return Array.prototype.splice.apply(origArray, args);
  }


  /**
   * Replaces the contents of @origArray with the contents of @newArray
   *
   * @param origArray
   * @param newArray
   */
  function replaceArray(origArray, newArray) { spliceArray(origArray, 0, origArray.length, newArray); }


  /**
   * Clears the contents of a given array.
   *
   * @param origArray
   */
  function clearArray(origArray) { spliceArray(origArray, 0, origArray.length); }

  // endregion


  //    ___  _     _           _     _   _ _   _ _
  //   / _ \| |__ (_) ___  ___| |_  | | | | |_(_) |___
  //  | | | | '_ \| |/ _ \/ __| __| | | | | __| | / __|
  //  | |_| | |_) | |  __/ (__| |_  | |_| | |_| | \__ \
  //   \___/|_.__// |\___|\___|\__|  \___/ \__|_|_|___/
  //            |__/
  //
  // region object utils

  /**
   * Deletes all object contents
   *
   * @param object
   */
  function clearObject(object) {
    for (var member in object) { delete object[member]; }
  }


  /**
   * Replace all @object contents with @newObject properties
   *
   * @param object
   * @param newObject
   */
  function replaceObject(object, newObject) {
    clearObject(object);
    _.assign(object, newObject);
  }


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @param obj
   * @param path
   */
  function getPropFromPath(obj, path) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') { objRef = objRef[keys[i]]; }
    }

    return (typeof objRef === 'object') ? objRef[targetKey] : undefined;
  }


  /**
   * Set the nested object property value based on a dot notated string path
   *
   * @param obj
   * @param path
   * @param value
   */
  function setPropFromPath(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        if (typeof objRef[keys[i]] === 'undefined' || objRef[keys[i]] === null) { objRef[keys[i]] = {}; }

        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') { objRef[targetKey] = value; }
  }

  // endregion


  //   ____        _          _   _ _   _ _
  //  |  _ \  __ _| |_ __ _  | | | | |_(_) |___
  //  | | | |/ _` | __/ _` | | | | | __| | / __|
  //  | |_| | (_| | || (_| | | |_| | |_| | \__ \
  //  |____/ \__,_|\__\__,_|  \___/ \__|_|_|___/
  //
  // region data utils

  /**
   * Given a number of bytes returns a well formatted size with units
   *
   * @param bytes
   * @param decimalPoint
   * @returns {string}
   */
  function bytesToReadable(bytes, decimalPoint) {
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
  }


  /**
   * This function returns a RFC4122 v4 compliant UUID string.
   */
  /*jslint bitwise: true */
  function generateUUID() {
    var d = (new Date()).getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
  }
  /*jslint bitwise: false */

  // endregion


  //   _____                   _   _ _   _ _
  //  |_   _|   _ _ __   ___  | | | | |_(_) |___
  //    | || | | | '_ \ / _ \ | | | | __| | / __|
  //    | || |_| | |_) |  __/ | |_| | |_| | \__ \
  //    |_| \__, | .__/ \___|  \___/ \__|_|_|___/
  //        |___/|_|
  //
  // region type utils

  /**
   * Parse given value into a boolean. Handles string values for falsey types.
   *
   * @param val
   * @return boolean
   */
  function parseBoolean(val) {
    var value   = String(val).toLowerCase();
    var falsey  = ['false', 'nan', 'undefined', 'null', '0', ''];

    return !_.includes(falsey, value);
  }

  // endregion


  //   _   _      _   _   _ _   _ _
  //  | | | |_ __| | | | | | |_(_) |___
  //  | | | | '__| | | | | | __| | / __|
  //  | |_| | |  | | | |_| | |_| | \__ \
  //   \___/|_|  |_|  \___/ \__|_|_|___/
  //
  // region url utils

  /**
   * Joins string arguments into a '/' separated path.
   */
  function joinPath() {
    var pathParts = _.toArray(arguments);

    if (!pathParts)             { return null;          }
    if (pathParts.length === 1) { return pathParts[0];  }

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

  // endregion


  //   _  __                        _
  //  | |/ /___ _   _  ___ ___   __| | ___  ___
  //  | ' // _ \ | | |/ __/ _ \ / _` |/ _ \/ __|
  //  | . \  __/ |_| | (_| (_) | (_| |  __/\__ \
  //  |_|\_\___|\__, |\___\___/ \__,_|\___||___/
  //            |___/
  //
  // region keycodes

  var keyCodes = Object.freeze({
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
  });

  // endregion


  // WilsonUtils Definition
  this.$get = [function() {

    var utilities = {
      spliceArray:        spliceArray,
      replaceArray:       replaceArray,
      clearArray:         clearArray,
      replaceObject:      replaceObject,
      clearObject:        clearObject,
      getPropFromPath:    getPropFromPath,
      setPropFromPath:    setPropFromPath,
      bytesToReadable:    bytesToReadable,
      generateUUID:       generateUUID,
      parseBoolean:       parseBoolean,
      bool:               parseBoolean,

      path:               { join: joinPath },
      keyCodes:           keyCodes
    };

    return utilities;

  }];

});