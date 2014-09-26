/**
 * Transport Helper Utilities
 *
 * @class TransportUtils
 *
 */
'use strict';

(function(wilson, _) {

  /**
   * Send a safe GET request to a given URL.
   *
   * @public
   * @method sendPing
   *
   * @param url - URL to ping.
   */
  var sendPing = function(url) {
    var ping      = new Image();
    ping.src = url + '?date=' + (new Date()).getTime();
  };

  angular.wilson.utils.sendPing = sendPing;

})(angular.wilson, _);