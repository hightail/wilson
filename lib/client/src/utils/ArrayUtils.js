/**
 * Array specific utilities
 *
 * @class ArrayUtils
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
  var spliceArray = wilson.utils.spliceArray = function spliceArray(origArray, start, replace, arrayToSplice) {
    var args = [start];
    if (arguments.length > 2) { args.push(replace); }
    if (arguments.length > 3) { args = args.concat(arrayToSplice); } // In case arrayToSplice is not passed in, otherwise appending 'undefined'
    return Array.prototype.splice.apply(origArray, args);
  };


  /**
   * Replaces the contents of @origArray with the contents of @newArray
   *
   * @param origArray
   * @param newArray
   */
  wilson.utils.replaceArray = function replaceArray(origArray, newArray) {
    spliceArray(origArray, 0, origArray.length, newArray);
  };


  /**
   * Clears the contents of a given array.
   *
   * @param origArray
   */
  wilson.utils.clearArray = function clearArray(origArray) {
    spliceArray(origArray, 0, origArray.length);
  };


})(angular.wilson, _);