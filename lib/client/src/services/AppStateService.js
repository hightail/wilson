/**
 * AppState Service
 *
 * This service stores Global state for the Application.  This state is a combination of
 * Routing, LocalData, etc
 *
 * @class AppStateService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('AppStateService', ['localStorageService', function(localStorageService) {
  /**
   * Retrieves a value from this component's persistent storage
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param defaultValue    The value to return if the @key is not found
   * @returns {*}
   */
  var getPersistentValue = function(localStorageKey, key, defaultValue) {
    var keyValue = defaultValue;

    //get the current localStorage value
    var localStorageValue = localStorageService.get(localStorageKey);

    //If a key is provided then only return the key's value
    if (localStorageValue && key) {
      keyValue = localStorageValue[key];
    }

    //If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) {
      keyValue = defaultValue;
    }


    return keyValue;
  };

  /**
   * Stores @keyValueHash properties under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param keyValueHash
   * @returns {*}
   */
  var setPersistentValues = function(localStorageKey, keyValueHash) {
    //get the current localStorage value
    var state = localStorageService.get(localStorageKey) || {};
    //extend the current values with the new ones
    _.extend(state, keyValueHash);
    //save changes
    localStorageService.add(localStorageKey, state);

    return state;
  };

  /**
   * Stores single @key:@value under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param value
   * @returns {*}
   */
  var setPersistentValue = function(localStorageKey, key, value) {
    var keyValueHash = {};
    keyValueHash[key] =  value;

    setPersistentValues(localStorageKey, keyValueHash);
  };

  // Service Object
  var service = {
    getPersistentValue: getPersistentValue,
    setPersistentValue: setPersistentValue,
    setPersistentValues: setPersistentValues
  };

  return service;
}]);
