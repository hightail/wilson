/**
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
