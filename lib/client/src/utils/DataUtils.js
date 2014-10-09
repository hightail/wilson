/**
 * Data specific utilities
 *
 * @class DataUtils
 *
 */
'use strict';

(function(wilson, _) {
  var SIZE_UNITS = [' Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var LOG_1024 = Math.log(1024);

  /**
   * Given a number of bytes returns a well formatted size with units
   *
   * @param bytes
   * @returns {string}
   */
  wilson.utils.bytesToReadable = function(bytes, decimalPoint) {
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
  };

  /**
   * This is a function that defines the sort order and it wlll be used with sort()
   * Given a props returns a sorted object
   */
  wilson.utils.getMultipleColumnSort = function(props) {
    return function(a,b) {
      return _.reduce(props,function(r,v) {
        if (r === 0 && a && b) {
          switch (true) {
            case  a[v] > b[v]:
              return 1;
            case a[v] < b[v]:
              return -1;
            case a[v] === b[v]:
              return 0;
          }
        }
        return r;
      },0);
    };
  };

  /**
   * This function returns a RFC4122 v4 compliant UUID string.
   */
  /*jslint bitwise: true */
  wilson.utils.generateUUID = function() {
    var d = (new Date()).getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
  };
  /*jslint bitwise: false */
})(angular.wilson, _);
