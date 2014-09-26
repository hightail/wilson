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
  var clearObject = function(object) {
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
  var replaceObject = function(object, newObject) {
    clearObject(object);
    _.extend(object, newObject);
  };


  /**
   * Get the nested object value based on a dot notated string path.
   *
   * @public
   * @method getPropFromPath
   * @param obj
   * @param path
   */
  var getPropFromPath = function(obj, path) {
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
   * @public
   * @method setPropFromPath
   * @param obj
   * @param path
   * @param value
   */
  var setPropFromPath = function(obj, path, value) {
    var keys        = path.split('.');
    var targetKey   = keys.pop();
    var objRef      = obj;

    for (var i in keys) {
      if (typeof objRef === 'object') {
        objRef = objRef[keys[i]];
      }
    }

    if (typeof objRef === 'object') {
      objRef[targetKey] = value;
    }
  };


  /**
   * Check the equivalency of 2 objects for a given set of fields and ignored fields.
   *
   * @param objA
   * @param objB
   * @param fields
   * @param ignoredFields
   * @returns {boolean}
   */
  var fieldsEqual = function(objA, objB, fields, ignoredFields) {
    fields        = fields || [];
    ignoredFields = ignoredFields || [];

    var compareTarget = _.omit(_.pick(objA, fields), ignoredFields);
    var isEqual       = true;

    _.each(compareTarget, function(value, key) {
      isEqual = isEqual && _.isEqual(value, objB[key]);
    });

    return isEqual;
  };


  wilson.utils.clearObject      = clearObject;
  wilson.utils.replaceObject    = replaceObject;
  wilson.utils.fieldsEqual      = fieldsEqual;
  wilson.utils.setPropFromPath  = setPropFromPath;
  wilson.utils.getPropFromPath  = getPropFromPath;
})(angular.wilson, _);