/**
 * ParserFactory Service
 *
 * @class ParserFactoryService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ParserFactoryService', ['$injector', function($injector) {
  /**
   * Create an new parser service instance
   *
   * @public
   * @method create
   * @param parseMethod
   * @param serializeMethod
   *
   * @returns {function} - new parser service instance
   */
  var create = function(parseMethod, serializeMethod) {

    if (typeof parseMethod !== 'function') {
      throw new Error('Error creating parser. Param parseMethod is not a function!');
    }

    // Optional SerializeMethod implementation
    if (typeof serializeMethod !== 'function') {
      serializeMethod = function(data) { return data; };
    }

    // Return the new parser
    return function() {
      var instanceParse = parseMethod;
      var instanceSerialize = serializeMethod;
      var _self = this;

      this.parse = function(data) {
        var args = _.toArray(arguments);
        args.unshift($injector);
        return instanceParse.call(_self, args);
      };

      this.serialize = function(data) {
        var args = _.toArray(arguments);
        args.unshift($injector);
        return instanceSerialize.apply(_self, args);
      };

      /**
       * Embellishes data
       *
       * @param data
       * @param ...         Rest args for any additional parameters you need to pass in
       */
      this.embellish = function(data) {
        //var args = Array.prototype.slice.call(arguments);
        var args = _.toArray(arguments);
        args.unshift($injector);
        var parsedData = instanceParse.apply(_self, args);
        return angular.wilson.embellishModel(data, parsedData);
      };

      /**
       * Embellishes a collection of items
       *
       * @param collection
       * @param ...         Rest args for any additional parameters you need to pass in
       */
      this.embellishCollection = function(collection) {
        //get the current arguments and remove the first param (the collection)
        var args = Array.prototype.slice.call(arguments);
        args.shift();

        //embellish each item in the collection
        _.each(collection, function(data, key) {
          //append the current collection data to the arguments
          args.unshift(data);
          //embellish the current collection item
          collection[key] = _self.embellish.apply(_self, args);
          //remove the current collection data from the arguments
          args.shift();
        });
      };
    };
  };

  // Service Object
  var service = {
    create: create
  };

  return service;
}]);
