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

wilson.service('ComponentFactoryService', ['$rootScope', '$timeout', '$injector', 'WilsonComponent',
  function($rootScope, $timeout, $injector, WilsonComponent) {
    
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
        if (parentScope[property]) { $scope[construct] = parentScope[property]; }
        else                       { wilson.log.error('Require parent interface method [' + property + '] not found!'); }
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
        ResourceLoaderService.loadResourceScripts(config.dependencies).then(
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
