/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonStorageHelper', ['localStorageService', function(localStorageService) {


  //    ____                _                   _
  //   / ___|___  _ __  ___| |_ _ __ _   _  ___| |_ ___  _ __
  //  | |   / _ \| '_ \/ __| __| '__| | | |/ __| __/ _ \| '__|
  //  | |__| (_) | | | \__ \ |_| |  | |_| | (__| || (_) | |
  //   \____\___/|_| |_|___/\__|_|   \__,_|\___|\__\___/|_|
  //
  //

  function WilsonStorageHelper(namespace) {
    this.namespace = namespace;
  }


  //    ____ _                 __  __      _   _               _
  //   / ___| | __ _ ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |   | |/ _` / __/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  | |___| | (_| \__ \__ \ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //   \____|_|\__,_|___/___/ |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  //region class methods

  /**
   * Retrieves a value from this component's persistent storage (localStorage)
   *
   * @param key
   * @param defaultValue    The value to return if the @key is not found
   * @returns {*}
   */
  WilsonStorageHelper.prototype.get = function get(key, defaultValue) {
    var keyValue          = defaultValue;
    var localStorageValue = localStorageService.get(this.namespace);

    // If a key is provided then only return the key's value
    if (localStorageValue && key) { keyValue = localStorageValue[key]; }

    // If no value is found then return the default
    if (_.isUndefined(keyValue) || _.isNull(keyValue)) { keyValue = defaultValue; }

    return keyValue;
  };


  /**
   * Stores @key:@value for this component in localStorage
   *
   * @param keyValueHash
   * @returns {*}
   */
  WilsonStorageHelper.prototype.set = function set(key, value) {
    var state         = localStorageService.get(this.namespace) || {};
    var keyValueHash  = {};

    if (arguments.length > 1) { keyValueHash[key] = value;  }   // If 2 args set single value
    else                      { keyValueHash      = key;    }   // If 1 arg treat as hash

    // Save changes and extend the current values with the new ones
    localStorageService.add(this.namespace,  _.extend(state, keyValueHash));

    return state;
  };


  // endregion


  return WilsonStorageHelper;

}]);