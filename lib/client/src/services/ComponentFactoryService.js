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
