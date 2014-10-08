/**
 * App Service
 *
 * @class AppService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.0
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('AppService', ['DummyService', function(DummyService) {
    DummyService.init();

    // Service Object
    var service = {
      log: function(message) {
        console.log('[AppService] ' + message);
      }
    };

    return service;
  }]
);
