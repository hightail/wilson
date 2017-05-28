/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonComponent', ['$rootScope', '$timeout', 'WilsonEventHelper', 'WilsonStorageHelper', 'StateMachineService', 'i18nextService', 'localStorageService',
  function($rootScope, $timeout, WilsonEventHelper, WilsonStorageHelper, StateMachineService, i18nextService, localStorageService) {

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
    WilsonComponent.prototype.defaultValue = function defaultValue(scopePropertyName, defaultValue) {
      var value = this.scope[scopePropertyName];
      if (_.isUndefined(value) || _.isNull(value)) {
        this.scope[scopePropertyName] = defaultValue;
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