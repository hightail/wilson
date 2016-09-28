/**
 * Utilities to help with URL (path) manipulation. Inspired byt the node.js 'path' module
 *
 * @class UrlUtils
 *
 */
'use strict';

(function(wilson, _) {
  var PATH_CHARS = ' /';

  // Define path namespace
  wilson.utils.path = {};

  /**
   * Joins string arguments into a '/' separated path.
   */
  wilson.utils.path.join = function joinPath() {
    var pathParts = _.toArray(arguments);

    if (!pathParts)             { return null; }
    if (pathParts.length === 1) { return pathParts[0]; }
    

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

})(angular.wilson, _);