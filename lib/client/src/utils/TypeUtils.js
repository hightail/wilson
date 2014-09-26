/**
 * Type specific utilities
 *
 * @class TypeUtils
 *
 */
'use strict';

(function(wilson, _) {


  wilson.utils.parseBoolean = function(val) {
    var value = String(val).toLowerCase();

    switch (value) {
      case 'false':
      case 'nan':
      case 'undefined':
      case 'null':
      case '0':
        return false;
      default:
    }

    return true;
  };


})(angular.wilson, _);