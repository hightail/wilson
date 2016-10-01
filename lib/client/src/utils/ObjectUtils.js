/**
 * Object specific utilities
 *
 * @class ObjectUtils
 *
 */
'use strict';

(function(wilson, _) {

  
  /**
   * Deletes all object contents
   *
   * @param object
   */
  var clearObject = wilson.utils.clearObject = function clearObject(object) {
    for (var member in object) {
      delete object[member];
    }
  };

  
  /**
   * Replace all @object contents with @newObject properties
   *
   * @param object
   * @param newObject
   */
  wilson.utils.replaceObject = function replaceObject(object, newObject) {
    clearObject(object);
    _.extend(object, newObject);
  }


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @param obj
   * @param path
   */
  wilson.utils.getPropFromPath = function getPropFromPath(obj, path) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        objRef = objRef[keys[i]];
      }
    }

    return (typeof objRef === 'object') ? objRef[targetKey] : undefined;
  };


  /**
   * Set the nested object property value based on a dot notated string path
   *
   * @param obj
   * @param path
   * @param value
   */
  wilson.utils.setPropFromPath = function setPropFromPath(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        if (typeof objRef[keys[i]] === 'undefined' || objRef[keys[i]] === null) {
          objRef[keys[i]] = {};
        }

        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') {
      objRef[targetKey] = value;
    }
  };

})(angular.wilson, _);