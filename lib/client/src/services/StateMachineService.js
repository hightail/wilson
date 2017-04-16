/**
 * A service extension of HtStateMachine that works with AngularJS. Use this service
 * if you need Angular data-binding to update automatically on state changes.
 *
 * @class StateMachineService
 * @extends HtStateMachine
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('StateMachineService', ['$timeout', function($timeout) {

  // Make HtStateMachine an extension of StateMachine
  var HtStateMachine = _.extend({}, StateMachine);


  /**
   * Override StateMachine's create method add custom functionality
   *
   * @public
   * @method create
   * @param cfg
   * @param target
   *
   * @return Object - A New StateMachine.
   */
  HtStateMachine.create = function htsmCreate(cfg, target) {
    cfg.error = cfg.error || function() { };  // Default invalid state change error to a noop

    decorateTimeoutCallbacks(cfg);

    var fsm     = StateMachine.create(cfg, target);
    fsm.states  = HtStateMachine.getStates(cfg);

    return fsm;
  };


  /**
   * Returns a StateMachine callback function that first runs newCallback
   * and then calls the pre-exiting callback (if there is one)
   *
   * @public
   * @method prependCallback
   * @param callbacks         The callbacks object
   * @param callbackName      The callback name to prepend to
   * @param newCallback       The new callback function
   *
   * @returns Function - The merged callback
   */
  HtStateMachine.preprendCallback = function htsmPrependCallback(callbacks, callbackName, newCallback) {
    var origCallback = callbacks[callbackName];

    var mergedCallback = function(name, from, to, args) {
      // Fire new callback
      newCallback.apply(this, [name, from, to, args]);

      // Fire original callback
      if (origCallback) { origCallback.apply(this, [name, from, to, args]); }
    };

    return mergedCallback;
  };


  /**
   * Returns an unique array of all States in the given config.
   *
   * @public
   * @method getStates
   * @param cfg
   */
  HtStateMachine.getStates = function htsmGetStates(cfg) {
    var states = [];
    var events = cfg.events || [];

    function appendStates(stateArray) {
      if (!_.isArray(stateArray)) { stateArray = [stateArray]; }
      states = states.concat(stateArray);
    }

    // Add all states from the events collection
    _.each(events, function(event) {
      appendStates(event.to);
      appendStates(event.from);
    });

    // Make the list unique
    states = _.uniq(states);

    return states;
  };


  /**
   * Returns true if stateName exists in the config.
   *
   * @public
   * @method hasState
   * @param cfg
   * @param stateName
   *
   * @return boolean - true if stateName exists.
   */
  HtStateMachine.hasState = function htsmHasState(cfg, stateName) {
    var states = HtStateMachine.getStates(cfg);
    return (_.indexOf(states, stateName) >= 0) ? true : false;
  };


  /**
   * Modifies StateMachine cfg to support timeouts from cfg.timeouts values
   *
   * e.g.
   * cfg.timeouts: [
   *    {state: 'Opened', duration: 3000, timeoutEvent: 'close', refreshEvent: 'open'}
   * ]
   *
   * @private
   * @method addTimeoutCallbacks
   * @param cfg
   */
  function decorateTimeoutCallbacks(cfg) {

    var callbacks     = cfg.callbacks     || {};
    var timeouts      = cfg.timeouts      || [];

    // Decorate Handlers for each timeout
    _.each(timeouts, function(timeout) {

      // Add ENTER STATE callback to set timeout
      var callbackName = 'onenter' + timeout.state;
      callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to) {
        var fsm             = this;
        var timeoutCallback = function() { fsm[timeout.timeoutEvent](); };

        $timeout.cancel(fsm.curTimeout);
        fsm.curTimeout = $timeout(timeoutCallback, timeout.duration);
      });

      // Add LEAVE STATE callback to set timeout
      callbackName            = 'onleave' + timeout.state;
      callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function() {
        var fsm = this;
        $timeout.cancel(fsm.curTimeout);
      });

      if (timeout.refreshEvent) {
        // Add REFRESH EVENT callbacks
        callbackName            = 'onbefore' + timeout.refreshEvent;
        callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to, args) {
          if (from === timeout.state) {
            var fsm = this;
            fsm['onenter' + timeout.state](name, from, to, args);
          }
        });
      }
    });

    cfg.callbacks = callbacks;
  }


  // Return HtStateMachine as the Service
  return HtStateMachine;
}]);
