/**
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
