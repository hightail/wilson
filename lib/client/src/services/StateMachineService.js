/**
 * A service extension of HtStateMachine that works with AngularJS. Use this service
 * if you need Angular data-binding to update automatically on state changes.
 *
 * @class StateMachineService
 * @extends HtStateMachine
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('StateMachineService',
  ['$timeout', function($timeout) {

    /**
     *
     * @param cfg
     * @param target
     * @returns {*}
     */
    var create = function(cfg, target) {
      //For Angular UI to update correctly on timed events
      //we need to us the $timeout service
      _.extend(cfg, {
        setTimeout: $timeout,
        clearTimeout: $timeout.cancel
      });

      return  HtStateMachine.create(cfg, target);
    };

    // Extend the HtStateMachine to create the service
    var service = _.extend({}, HtStateMachine);
    service.create = create;

    return service;
  }]

);
