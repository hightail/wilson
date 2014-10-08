/**
 * Dummy Service
 *
 * @class DummyService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.0
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('DummyService', function() {
  // Service Object
  var service = {
    init: function() {
      console.log('DummyService has initialized');
    }
  };

  return service;
});
