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