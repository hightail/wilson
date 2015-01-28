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
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.prerender', []).provider('ComponentPrerenderService', ['$compileProvider', function($compileProvider) {

  //Mark prerender as incomplete
  window.prerenderReady = false;

  function prerenderLog(message) {
    var prerenderConfig = angular.wilson.config.prerender;
    if (prerenderConfig && prerenderConfig.enableLogs) {
      console.log(message);
    }
  }

  /**
   * Registers additional ngRepeat directive to track rendering status
   */
  function registerPrerenderNgRepeat() {
    $compileProvider.directive('ngRepeat', ['$timeout', function($timeout) {
      /**
       * Returns the property that ngRepeat is iterating on
       *
       * @param scope
       * @returns {undefined}
       */
      function getNgRepeatValue(scope) {
        var prop = undefined;

        for(var key in scope) {
          if (!(key === 'this' || _.str.startsWith(key, '$'))) {
            prop = {};
            prop[key] = scope[key];
            break;
          }
        };

        return prop;
      }

      /**
       * Additional ngRepeat directive to track when the ngRepeat
       * has finished populating the view
       */
      return {
        restrict: 'A',
        priority: -1,
        require: ['?ngRepeat', '^?WilsonComponent'],
        link: function($scope, $element, $attrs, ctrls) {
          //only do this is rendering has not completed
          if (!window.prerenderReady) {
            var controller = ctrls[0];
            var cmpCtrl = ctrls[1];

            if ($scope.$first) {
              cmpCtrl.registerViewDependency();
            }

            if ($scope.$last) { // all are rendered
              cmpCtrl.defferedResolveViewDependency();
            }
          }
        }
      };
    }]);
  }

  /**
   * Returns the ComponentPrerenderService
   *
   * @public
   * @method $get
   */

  this.$get = ['$timeout', function($timeout) {
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
      function registerViewDependency() {
        viewDepCount++;

        //console.log(_.str.sprintf('Added dep to %s. Count: %d', componentName, viewDepCount));
      };

      /**
       * Immediately marks @count child view dependencies as resolved
       * @type {Function}
       */
      function resolveViewDependency(count) {
        count = count || 1;

        if (viewDepCount >= count) {
          viewDepCount -= count;
        } else {
          prerenderLog('ERROR: Attempt to resolve more view deps than were added');
        }


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
      };

      /**
       * Marks a child view dependencies as resolved but deffers the resolution to allow for $digest() and render cycles to complete
       *
       * @type {Function}
       */
      function defferedResolveViewDependency() {
        if (pendingResolveDepCount < 1) {
          pendingResolveDepCount++;
          $timeout(function () {
            $timeout(function () {
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
      function checkViewDependencies() {
        $timeout(function () {
          $timeout(function () {
            //console.log(_.str.sprintf('Checking deps for [%s](1)', $scope.componentCName));
            if (viewDepCount === 0 && $scope.parentComponent && $scope.parentComponent.componentCName) {
              //console.log(_.str.sprintf('All deps resolved for [%s](1)', $scope.componentCName));
              $scope.parentComponent.resolveViewDependency();
            }
          }, 0);
        }, 0);
      };

      /**
       * Register a data dependency that must be resolved before the view can render fully
       *
       * @param key             The $scope key for the data dependency (Ex: to track $scope.myValue => registerDataDependency('myValue'))
       * @param validationFunc  A function that returns true when the data is considered valid. Defaults to !_.isEmpty(value)
       */
      function registerDataDependency(key, validationFunc) {
        //console.log(_.str.sprintf('Registering data dep: %s.%s', $scope.componentCName, key));
        //register view dependency
        controller.registerViewDependency();

        //default validation function to !_.isEmpty()
        if (!validationFunc) {
          validationFunc = function (value) {
            return !_.isEmpty(value);
          }
        }

        //Add watch to key value
        var removeWatch = $scope.$watch(key, function (newValue) {
          if (validationFunc(newValue)) {
            removeWatch();
            //console.log(_.str.sprintf('Resolved data dep: %s.%s', $scope.componentCName, key));
            controller.defferedResolveViewDependency();
          }
        });
      };

      //Component prerender functions
      var prerenderFunctions = {
        registerViewDependency: registerViewDependency,
        registerDataDependency: registerDataDependency,
        checkViewDependencies: checkViewDependencies,
        resolveViewDependency: resolveViewDependency,
        defferedResolveViewDependency: defferedResolveViewDependency
      };

      //Add prerender functions to the $scope and controller
      _.merge($scope, prerenderFunctions);
      _.merge(controller, prerenderFunctions);

    }

    function deregisterPrerenderNgRepeat() {
      //TODO: Figure out how to remove the extra ngRepeat directive
      //var ngRepeat = $injector.get('ngRepeat');
      //console.log('ngRepeat', ngRepeat);
      //var ngRepeat = $injector.get('ngRepeat');
      //console.log('ngRepeat', ngRepeat);
      //$provide.value('ngRepeat', []);
    }


    //Add additional ngRepeat directive for render tracking
    registerPrerenderNgRepeat();

    // Service Object Definition
    var service = {
      addPrerenderMethods: addPrerenderMethods,
      deregisterPrerenderNgRepeat: deregisterPrerenderNgRepeat
    };

    return service;
  }];
}]);