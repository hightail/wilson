/**
 * This factory returns EventBus instances based on an id. New buses are created for any id not yet existing.
 *
 * @class BusFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 */
'use strict';

angular.wilson.service('BusFactoryService',
  function() {
    /**
     * The default value for a bus id if no parent bus exists.
     * @private
     * @property DEFAULT_BUS_ID
     * @type String
     */
    var DEFAULT_BUS_ID = 'default';

    /**
     * The collection of all active event buses.
     * @private
     * @property busCollection
     * @type Object
     */
    var busCollection = {};


    // Service Object
    var service = {

      /**
       * Returns an event bus for a given id. If one does not yet exist
       * under that name, a new one is created for it.
       *
       * @public
       * @method get
       * @param id
       * @return Object - The event bus associated with the given id.
       */
      get: function(id) {
        //If no ID is given return the default bus
        if (id === undefined || id === '' || id === null) {
          id = DEFAULT_BUS_ID;
        }

        //Get the bus by ID
        var bus = busCollection[id];

        //If a bus by that ID doesnt exist, create it
        if (!bus) {
          bus = busCollection[id] = new EventTarget();
          bus.name = id;
        }

        //Return the bus
        return bus;
      }

    };

    return service;
  }
);
