/**
 * Data specific utilities
 *
 * @class DataUtils
 *
 */
'use strict';

(function(wilson, _) {

  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start Start index
   * @param replace Number of elements to remove
   * @param arrayToSplice Optional array to append
   */
  var spliceArray = function(origArray, start, replace, arrayToSplice) {
    var args = [start, replace];
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    Array.prototype.splice.apply(origArray, args);
  };

  /**
   * Replaces the contents of @origArray with the contents of @newArray
   * @param origArray
   * @param newArray
   */
  var replaceArray = function(origArray, newArray) {
    spliceArray(origArray, 0, origArray.length, newArray);
  };

  /**
   * Replaces the contents of @origArray with the contents of @newArray
   * @param origArray
   * @param newArray
   */
  var clearArray = function(origArray) {
    spliceArray(origArray, 0, origArray.length);
  };

  wilson.utils.spliceArray = spliceArray;
  wilson.utils.replaceArray = replaceArray;
  wilson.utils.clearArray = clearArray;
})(angular.wilson, _);