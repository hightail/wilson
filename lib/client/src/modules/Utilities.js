/**
 * Module that provides utility functions.
 *
 * The module is declared with an accompanying service that provides all supported
 * utility functions.
 *
 * @module wilson
 * @submodule wilson.utils
 *
 * @author hunter.novak
 * @since 3.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.utils', []).provider('WilsonUtils', function() {


  // Constants
  var SIZE_UNITS  = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var LOG_1024    = Math.log(1024);
  var PATH_CHARS  = ' /';


  //      _                           _   _ _   _ _
  //     / \   _ __ _ __ __ _ _   _  | | | | |_(_) |___
  //    / _ \ | '__| '__/ _` | | | | | | | | __| | / __|
  //   / ___ \| |  | | | (_| | |_| | | |_| | |_| | \__ \
  //  /_/   \_\_|  |_|  \__,_|\__, |  \___/ \__|_|_|___/
  //                          |___/
  //
  // region array utils

  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start Start index
   * @param replace Number of elements to remove
   * @param arrayToSplice Optional array to append
   */
  function spliceArray(origArray, start, replace, arrayToSplice) {
    var args = [start];
    if (arguments.length > 2) { args.push(replace); }
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    return Array.prototype.splice.apply(origArray, args);
  }


  /**
   * Replaces the contents of @origArray with the contents of @newArray
   *
   * @param origArray
   * @param newArray
   */
  function replaceArray(origArray, newArray) { spliceArray(origArray, 0, origArray.length, newArray); }


  /**
   * Clears the contents of a given array.
   *
   * @param origArray
   */
  function clearArray(origArray) { spliceArray(origArray, 0, origArray.length); }

  // endregion


  //    ___  _     _           _     _   _ _   _ _
  //   / _ \| |__ (_) ___  ___| |_  | | | | |_(_) |___
  //  | | | | '_ \| |/ _ \/ __| __| | | | | __| | / __|
  //  | |_| | |_) | |  __/ (__| |_  | |_| | |_| | \__ \
  //   \___/|_.__// |\___|\___|\__|  \___/ \__|_|_|___/
  //            |__/
  //
  // region object utils

  /**
   * Deletes all object contents
   *
   * @param object
   */
  function clearObject(object) {
    for (var member in object) { delete object[member]; }
  }


  /**
   * Replace all @object contents with @newObject properties
   *
   * @param object
   * @param newObject
   */
  function replaceObject(object, newObject) {
    clearObject(object);
    _.assign(object, newObject);
  }


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @param obj
   * @param path
   */
  function getPropFromPath(obj, path) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') { objRef = objRef[keys[i]]; }
    }

    return (typeof objRef === 'object') ? objRef[targetKey] : undefined;
  }


  /**
   * Set the nested object property value based on a dot notated string path
   *
   * @param obj
   * @param path
   * @param value
   */
  function setPropFromPath(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        if (typeof objRef[keys[i]] === 'undefined' || objRef[keys[i]] === null) { objRef[keys[i]] = {}; }

        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') { objRef[targetKey] = value; }
  }

  // endregion


  //   ____        _          _   _ _   _ _
  //  |  _ \  __ _| |_ __ _  | | | | |_(_) |___
  //  | | | |/ _` | __/ _` | | | | | __| | / __|
  //  | |_| | (_| | || (_| | | |_| | |_| | \__ \
  //  |____/ \__,_|\__\__,_|  \___/ \__|_|_|___/
  //
  // region data utils

  /**
   * Given a number of bytes returns a well formatted size with units
   *
   * @param bytes
   * @param decimalPoint
   * @returns {string}
   */
  function bytesToReadable(bytes, decimalPoint) {
    decimalPoint = _.isNumber(decimalPoint) ? decimalPoint : 1;

    // Make Sure we have a number!
    bytes = parseInt(bytes, 10);

    if (bytes === 0) {
      //This is has no size return
      return '0 Bytes';
    } else {
      //Determine the factor of KB's
      var kbFactor = parseInt(Math.floor(Math.log(bytes) / LOG_1024), 10);

      //convert bytes to the new unit
      var size = bytes / Math.pow(1024, kbFactor);

      //convert the size to formatted string
      var sizeText = (kbFactor === 0) ? size.toString() : size.toFixed(decimalPoint);

      //remove any trailing zeroes
      sizeText = sizeText.replace(/\.0+$/, '');

      //return the final string
      return sizeText + ' ' + SIZE_UNITS[kbFactor];
    }
  }


  /**
   * This function returns a RFC4122 v4 compliant UUID string.
   */
  /*jslint bitwise: true */
  function generateUUID() {
    var d = (new Date()).getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
  }
  /*jslint bitwise: false */

  // endregion


  //   _____                   _   _ _   _ _
  //  |_   _|   _ _ __   ___  | | | | |_(_) |___
  //    | || | | | '_ \ / _ \ | | | | __| | / __|
  //    | || |_| | |_) |  __/ | |_| | |_| | \__ \
  //    |_| \__, | .__/ \___|  \___/ \__|_|_|___/
  //        |___/|_|
  //
  // region type utils

  /**
   * Parse given value into a boolean. Handles string values for falsey types.
   *
   * @param val
   * @return boolean
   */
  function parseBoolean(val) {
    var value   = String(val).toLowerCase();
    var falsey  = ['false', 'nan', 'undefined', 'null', '0', ''];

    return !_.includes(falsey, value);
  }

  // endregion


  //   _   _      _   _   _ _   _ _
  //  | | | |_ __| | | | | | |_(_) |___
  //  | | | | '__| | | | | | __| | / __|
  //  | |_| | |  | | | |_| | |_| | \__ \
  //   \___/|_|  |_|  \___/ \__|_|_|___/
  //
  // region url utils

  /**
   * Joins string arguments into a '/' separated path.
   */
  function joinPath() {
    var pathParts = _.toArray(arguments);

    if (!pathParts)             { return null;          }
    if (pathParts.length === 1) { return pathParts[0];  }

    function getTrimMethod(index, length) {
      if (index === 0)            { return _.trimEnd;   }
      if (index === (length - 1)) { return _.trimStart; }

      return _.trim;
    }

    var trimmedParts = [];
    for (var i = 0; i < pathParts.length; i++) {
      var trim = getTrimMethod(i, pathParts.length);
      trimmedParts.push(trim(pathParts[i], PATH_CHARS));
    }

    return trimmedParts.join('/');
  }

  // endregion


  //   _  __                        _
  //  | |/ /___ _   _  ___ ___   __| | ___  ___
  //  | ' // _ \ | | |/ __/ _ \ / _` |/ _ \/ __|
  //  | . \  __/ |_| | (_| (_) | (_| |  __/\__ \
  //  |_|\_\___|\__, |\___\___/ \__,_|\___||___/
  //            |___/
  //
  // region keycodes

  var keyCodes = Object.freeze({
    KEY_CANCEL: 3,
    KEY_HELP: 6,
    KEY_BACK_SPACE: 8,
    KEY_TAB: 9,
    KEY_CLEAR: 12,
    KEY_RETURN: 13,
    KEY_ENTER: 14,
    KEY_SHIFT: 16,
    KEY_CONTROL: 17,
    KEY_ALT: 18,
    KEY_PAUSE: 19,
    KEY_CAPS_LOCK: 20,
    KEY_ESCAPE: 27,
    KEY_SPACE: 32,
    KEY_PAGE_UP: 33,
    KEY_PAGE_DOWN: 34,
    KEY_END: 35,
    KEY_HOME: 36,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_PRINTSCREEN: 44,
    KEY_INSERT: 45,
    KEY_DELETE: 46,
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_SEMICOLON: 186,   //this is for chrome/ie
    KEY_SEMICOLON_FF: 59, //this is for firefox
    KEY_EQUALS: 61,
    KEY_A: 65,
    KEY_B: 66,
    KEY_C: 67,
    KEY_D: 68,
    KEY_E: 69,
    KEY_F: 70,
    KEY_G: 71,
    KEY_H: 72,
    KEY_I: 73,
    KEY_J: 74,
    KEY_K: 75,
    KEY_L: 76,
    KEY_M: 77,
    KEY_N: 78,
    KEY_O: 79,
    KEY_P: 80,
    KEY_Q: 81,
    KEY_R: 82,
    KEY_S: 83,
    KEY_T: 84,
    KEY_U: 85,
    KEY_V: 86,
    KEY_W: 87,
    KEY_X: 88,
    KEY_Y: 89,
    KEY_Z: 90,
    KEY_CONTEXT_MENU: 93,
    KEY_NUMPAD0: 96,
    KEY_NUMPAD1: 97,
    KEY_NUMPAD2: 98,
    KEY_NUMPAD3: 99,
    KEY_NUMPAD4: 100,
    KEY_NUMPAD5: 101,
    KEY_NUMPAD6: 102,
    KEY_NUMPAD7: 103,
    KEY_NUMPAD8: 104,
    KEY_NUMPAD9: 105,
    KEY_MULTIPLY: 106,
    KEY_ADD: 107,
    KEY_SEPARATOR: 108,
    KEY_SUBTRACT: 109,
    KEY_DECIMAL: 110,
    KEY_DIVIDE: 111,
    KEY_F1: 112,
    KEY_F2: 113,
    KEY_F3: 114,
    KEY_F4: 115,
    KEY_F5: 116,
    KEY_F6: 117,
    KEY_F7: 118,
    KEY_F8: 119,
    KEY_F9: 120,
    KEY_F10: 121,
    KEY_F11: 122,
    KEY_F12: 123,
    KEY_F13: 124,
    KEY_F14: 125,
    KEY_F15: 126,
    KEY_F16: 127,
    KEY_F17: 128,
    KEY_F18: 129,
    KEY_F19: 130,
    KEY_F20: 131,
    KEY_F21: 132,
    KEY_F22: 133,
    KEY_F23: 134,
    KEY_F24: 135,
    KEY_NUM_LOCK: 144,
    KEY_SCROLL_LOCK: 145,
    KEY_COMMA: 188,
    KEY_HYPHEN: 189,
    KEY_PERIOD: 190,
    KEY_SLASH: 191,
    KEY_BACK_QUOTE: 192,
    KEY_OPEN_BRACKET: 219,
    KEY_BACK_SLASH: 220,
    KEY_CLOSE_BRACKET: 221,
    KEY_QUOTE: 222,
    KEY_META: 224
  });

  // endregion


  // WilsonUtils Definition
  this.$get = [function() {

    var utilities = {
      spliceArray:        spliceArray,
      replaceArray:       replaceArray,
      clearArray:         clearArray,
      replaceObject:      replaceObject,
      clearObject:        clearObject,
      getPropFromPath:    getPropFromPath,
      setPropFromPath:    setPropFromPath,
      bytesToReadable:    bytesToReadable,
      generateUUID:       generateUUID,
      parseBoolean:       parseBoolean,
      bool:               parseBoolean,

      path:               { join: joinPath },
      keyCodes:           keyCodes
    };

    return utilities;

  }];

});