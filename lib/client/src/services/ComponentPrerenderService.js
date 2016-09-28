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
            if ($scope.$last)   { cmpCtrl.defferedResolveViewDependency();  } // All rendered
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
            controller.defferedResolveViewDependency();
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

    // Default service (in case prerender is disabled)
    var service = { addPrerenderMethods: function() {}, deregisterPrerenderNgRepeat: function() {} };


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