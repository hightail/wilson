/**
 * Error Utils
 *
 * @class ErrorUtils
 *
 * Author: hunter.novak
 * Date: 2/11/2014
 */
'use strict';

(function(wilson, _) {

  // return platform error code for the response
  wilson.utils.printStackTrace = function() {
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
    console.log(stack);
  };

})(angular.wilson, _);
