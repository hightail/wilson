/**
 * A extension of javascript-state-machine's StateMachine
 *
 * Added features:
 *  - States can automatically timeout via @cfg.timeouts
 *  - FSM's have a fsm.states that is an array that contains a list of unique states
 *
 * @class HtStateMachine
 * @extends StateMachine
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */

'use strict';

(function(window, _) {

    //Make HtStateMachine an extension of StateMachine
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
    HtStateMachine.create = function(cfg, target) {
        var addEvents = false;
        var fsm = null;

        // Removes the default invalid state change errors from the console
        cfg.error = cfg.error || function() { };

        if (!addEvents) {
            addTimeoutCallbacks(cfg);
            fsm = StateMachine.create(cfg, target);
        } else {
            //Warning: This is not working right now
            fsm = createEventStateMachine(cfg, target);
            addTimeoutEventListeners(fsm, cfg);
        }

        fsm.states = HtStateMachine.getStates(cfg);

        //console.log('fsm.states');
        //console.log(fsm.states);

        return fsm;
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
    function addTimeoutCallbacks(cfg) {
        //private vars
        var callbacks = cfg.callbacks || {};
        var timeouts = cfg.timeouts || [];
        var _setTimeout = cfg.setTimeout;// || setTimeout;
        var _clearTimeout = cfg.clearTimeout;// || clearTimeout;

        _.each(timeouts, function(timeout) {
            //console.log('addTimeoutCallbacks' + timeout.state);

            var callbackName = 'onenter' + timeout.state;
            callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to) {
                var fsm = this;

                var timeoutCallback = function() {
                    //console.log('Timeout(' + cfg.blah + '):' + to);
                    //console.log(fsm);
                    fsm[timeout.timeoutEvent]();
                };

                _clearTimeout(fsm.curTimeout);
                fsm.curTimeout = _setTimeout(timeoutCallback, timeout.duration);
            });

            //Add LEAVE STATE callback to set timeout
            callbackName = 'onleave' + timeout.state;
            callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function() {
                var fsm = this;
                _clearTimeout(fsm.curTimeout);
            });

            if (timeout.refreshEvent) {
                //Add REFRESH EVENT callbacks
                callbackName = 'onbefore' + timeout.refreshEvent;
                callbacks[callbackName] = HtStateMachine.preprendCallback(callbacks, callbackName, function(name, from, to, args) {
                    if (from === timeout.state) {
                        //console.log('Reset Callback called for:' + callbackName + ' from:' + from + ' to:' + to);
                        var fsm = this;

                        fsm['onenter' + timeout.state](name, from, to, args);
                    }
                });
            }
        });

        cfg.callbacks = callbacks;
    }

    /**
     * Returns a StateMachine callback function that first runs newCallback
     * and then calls the preexiting callback (if there is one)
     *
     * @public
     * @method prependCallback
     * @param callbacks         The callbacks object
     * @param callbackName      The callback name to prepend to
     * @param newCallback       The new callback function
     *
     * @returns Function - The merged callback
     */
    HtStateMachine.preprendCallback = function(callbacks, callbackName, newCallback) {
        var origCallback = callbacks[callbackName];

        var mergedCallback = function(name, from, to, args) {
            var fsm = this;

            //call new callback
            newCallback.apply(fsm, [name, from, to, args]);

            //call original callback
            if (origCallback) {
                origCallback.apply(fsm, [name, from, to, args]);
            }
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
    HtStateMachine.getStates = function(cfg) {
        var states = [];
        var events = cfg.events || [];

        function appendStates(stateArray) {
            if (!_.isArray(stateArray)) {
                stateArray = [stateArray];
            }
            states = states.concat(stateArray);
        }

        //Add all states from the events collection
        _.each(events, function(event) {
            appendStates(event.to);
            appendStates(event.from);
        });

        //make the list unique
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
    HtStateMachine.hasState = function(cfg, stateName) {
        var states = HtStateMachine.getStates(cfg);
        if (_.indexOf(states, stateName) >= 0) {
            return true;
        }
        return false;
    };

    /**
     * WARNING: This is NOT WORKING. Fix before using.
     *
     * Given a @cfg returns a new StateMachine that will dispatch events for all
     * generic 'events' ('onbeforeevent', 'onleavestate', 'onenterstate', 'onafterevent')
     *
     * Events follow the EventTarget.js interface (on, off, trigger)
     *
     * @private
     * @method createEventStateMachine
     * @param cfg
     * @param target
     *
     * @returns Object - Event based StateMachine object.
     */
    function createEventStateMachine(cfg, target) {
        var callbacks = cfg.callbacks || {};
        var eventCallbacks = {};

        var eventDispatcher = new EventTarget();
        //Create events for all General callbacks
        var eventCallbackNames = ['onbeforeevent', 'onleavestate', 'onenterstate', 'onafterevent'];
        _.each(eventCallbackNames, function(callbackName) {

            (function(origCallback) {
                //change the original callbacks to use events
                if (origCallback) {
                    eventDispatcher.on(callbackName, function(event) {
                        origCallback(event.name, event.from, event.to, event.args);
                    });
                }
            })(callbacks[callbackName]);

            //create a callback that dispatches an event
            eventCallbacks[callbackName] = function(name, from, to, args) {
                //console.log('Event Callback (' + name + '): ' + callbackName);
                eventDispatcher.trigger({   type: callbackName,
                    name: name,
                    from: from,
                    to: to,
                    args: args
                });
            };

            callbacks[callbackName] = eventCallbacks[callbackName];
        });


        //Create StateMachine and add events to it
        var fsm = StateMachine.create(cfg, target);
        fsm = _.extend(eventDispatcher, fsm);

        return fsm;
    }

    /**
     * WARNING: This is dependant on createEventStateMachine() which is currently broken
     *
     * Adds timeout listers to a Event Statemachine created by createEventStateMachine()
     *
     * @private
     * @method addTimeoutEventListeners
     * @param fsm
     * @param cfg
     */
    function addTimeoutEventListeners(fsm, cfg) {
        //This is the timeout id or promise
        var curTimeout;

        var timeouts = cfg.timeouts || [];
        var _setTimeout = cfg.setTimeout || setTimeout;
        var _clearTimeout = cfg.clearTimeout || clearTimeout;

        //add timeout listeners
        fsm.on('onenterstate', function(event) {
            var timeout = _.findWhere(timeouts, {state: event.to});
            if (timeout) {
                console.log('Timeout found for:' + event.to);
                curTimeout = _setTimeout(function() {
                                console.log('Timeout:' + event.to);
                                fsm[timeout.timeoutEvent]();
                            }, timeout.duration);
            }
        });

        fsm.on('onleavestate', function() {
            _clearTimeout(curTimeout);
        });
    }

    //Set Global instance var
    window.HtStateMachine = HtStateMachine;

})(this, _);
