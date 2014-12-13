/**
 * Adds prerender functions to component
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

angular.wilson.service('ComponentPrerenderService', ['$timeout', function($timeout) {
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
      $scope.registerViewDependency = controller.registerViewDependency = function() {
        viewDepCount++;

        //console.log(_.str.sprintf('Added dep to %s. Count: %d', componentName, viewDepCount));
      };

      /**
       * Immediately marks @count child view dependencies as resolved
       * @type {Function}
       */
      $scope.resolveViewDependency = controller.resolveViewDependency = function(count) {
        count = count || 1;

        if (viewDepCount >= count) {
          viewDepCount -= count;
        } else {
          console.log('ERROR: Attempt to resolve more view deps than were added');
        }


        if (viewDepCount === 0) {
          console.log('All view dependencies have resolved for component ' + $scope.componentCName);
          $scope.renderComplete = true;

          if ($scope.parentComponent && $scope.parentComponent.componentCName) {
            $scope.parentComponent.resolveViewDependency();
          } else {
            console.log('PRERENDER COMPLETE!!!');
            window.prerenderReady = true;
          }
        }
      };

      /**
       * Marks a child view dependencies as resolved but deffers the resolution to allow for $digest() and render cycles to complete
       *
       * @type {Function}
       */
      $scope.defferedResolveViewDependency = controller.defferedResolveViewDependency = function() {
        if(pendingResolveDepCount < 1) {
          pendingResolveDepCount++;
          $timeout(function() {
            $timeout(function() {
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
      $scope.checkViewDependencies = controller.checkViewDependencies = function() {
        $timeout(function() {
          $timeout(function() {
            //console.log(_.str.sprintf('Checking deps for [%s](1)', $scope.componentCName));
            if (viewDepCount === 0  && $scope.parentComponent && $scope.parentComponent.componentCName) {
              //console.log(_.str.sprintf('All deps resolved for [%s](1)', $scope.componentCName));
              $scope.parentComponent.resolveViewDependency();
            }
          }, 0);
        }, 0);
      };

      controller.registerDataDependency = function(key, validationFunc) {
        //console.log(_.str.sprintf('Registering data dep: %s.%s', $scope.componentCName, key));
        //register view dependency
        controller.registerViewDependency();

        //default validation function to !_.isEmpty()
        if (!validationFunc) {
          validationFunc = function(value) {
            return !_.isEmpty(value);
          }
        }

        //Add watch to key value
        var removeWatch = $scope.$watch(key, function(newValue) {
          if (validationFunc(newValue)) {
            removeWatch();
            //console.log(_.str.sprintf('Resolved data dep: %s.%s', $scope.componentCName, key));
            controller.defferedResolveViewDependency();
          }
        });
      };
    }


    // Service Object Definition
    var service = {
      addPrerenderMethods: addPrerenderMethods
    };

    return service;
  }]
);
