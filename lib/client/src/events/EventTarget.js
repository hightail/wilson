/**
 * Primary Event Class.  Represents an event that can be subscribed to or published by an through an event bus.
 *
 * @class EventTarget
 *
 * @author Nicholas C. Zakas
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @license MIT License
 * @copyright (c) 2010 Nicholas C. Zakas. All Rights Reserved.
 */
'use strict';

(function(window, _) {

  function EventTarget() {
    var _self = this;
    /**
     * The set of listeners for all event types.
     *
     * @private
     * @property _listeners
     * @type Object
     */
    _self._listeners = {};

    /**
     * A random id generated for this instance.
     *
     * @private
     * @property id
     * @type Number
     */
    _self.id = Math.floor(Math.random() * 100) + 1;

    /**
     * Subcribes a listener to a specific event type.
     *
     * @public
     * @method subscribe
     * @param type
     * @param listener
     */
    var subscribe = function(type, listener) {
      if (typeof _self._listeners[type] === 'undefined') {
        _self._listeners[type] = [];
      }

      _self._listeners[type].push(listener);
    };

    /**
     * Publishes an event with a given set of params.
     *
     * @public
     * @method publish
     * @param event
     * @param params
     */
    var publish = function(event, params) {
      if (typeof event === 'string') {
        event = _.extend({}, params, { type: event });
      }
      if (!event.target) {
        event.target = this;
      }

      if (!event.type) {  //falsy
        throw new Error('Event object missing "type" property.');
      }

      if (_self._listeners[event.type] instanceof Array) {
        var listeners = _self._listeners[event.type];
        for (var i = 0, len = listeners.length; i < len; i++) {
          listeners[i].call(this, event);
        }
      }
    };

    /**
     * Unsubscribes a listener from a given event type.
     *
     * @public
     * @method unsubscribe
     * @param type
     * @param listener
     */
    var unsubscribe = function(type, listener) {
      if (_self._listeners[type] instanceof Array) {
        var listeners = _self._listeners[type];
        for (var i = 0, len = listeners.length; i < len; i++) {
          if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
          }
        }
      }
    };

    //Expose the API
    _self.publish = publish;
    _self.subscribe = subscribe;
    _self.unsubscribe = unsubscribe;
  }

  EventTarget.prototype = {
    constructor: EventTarget
  };

  window.EventTarget = EventTarget;
})(this, _);
