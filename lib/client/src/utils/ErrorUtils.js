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

  /**
   * Print a pretty-formatted stack trace into the console.
   */
  wilson.utils.printStackTrace = function printStackTrace() {
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
    console.log(stack);
  };

})(angular.wilson, _);
