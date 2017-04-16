/**
 * AppState Service
 *
 * This service stores Global state for the Application.  This state is a combination of
 * Routing, LocalData, etc
 *
 * @class AppStateService
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('AppStateService', ['localStorageService', function(localStorageService) {

  
  //   ____                  _            __  __      _   _               _
  //  / ___|  ___ _ ____   _(_) ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  \___ \ / _ \ '__\ \ / / |/ __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //   ___) |  __/ |   \ V /| | (_|  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //  |____/ \___|_|    \_/ |_|\___\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  // region service methods

  /**
   * Retrieves a value from this component's persistent storage
   *
   * @param localStorageKey The localStorage key
   * @param key             The key for this particular value
   * @param defaultValue    The value to return if the @key is not found
   * @returns {*}
   */
  function getPersistentValue(localStorageKey, key, defaultValue) {
    var keyValue          = defaultValue;
    var localStorageValue = localStorageService.get(localStorageKey);

    // If a key is provided then only return the key's value
    if (localStorageValue && key) { keyValue = localStorageValue[key]; }

    // If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) { keyValue = defaultValue; }

    return keyValue;
  };


  /**
   * Stores @keyValueHash properties under @localStorageKey
   *
   * @param localStorageKey The localStorage key
   * @param keyValueHash
   * @returns {*}
   */
  function setPersistentValues(localStorageKey, keyValueHash) {
    // Get the current localStorage value
    var state = localStorageService.get(localStorageKey) || {};

    // Extend the current values with the new ones
    _.extend(state, keyValueHash);

    // Save changes
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
  function setPersistentValue(localStorageKey, key, value) {
    var keyValueHash  = {};
    keyValueHash[key] =  value;

    setPersistentValues(localStorageKey, keyValueHash);
  };

  // endregion


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    getPersistentValue:   getPersistentValue,
    setPersistentValue:   setPersistentValue,
    setPersistentValues:  setPersistentValues
  };

  return service;
}]);
