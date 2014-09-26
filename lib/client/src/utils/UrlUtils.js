/**
 * Utilities to help with URL (path) manipulation. Inspired byt the node.js 'path' module
 *
 * @class UrlUtils
 *
 */
'use strict';

(function(wilson, _) {
  var PATH_CHARS = ' /';


  /**
   * Translates a URL-encoded sequence into a fully unescaped string
   *
   * @param {string} url
   * @return {string}
   */
  var decodeURL = function(url) {
    if (!url) {
      return '';
    }
    url = String(url);
    return decodeURIComponent( url.replace(/\+/g, '%20') );
  };


  /**
   * Splices the contents of @arrayToSplice into @origArray
   *
   * @param origArray
   * @param start
   * @param replace
   * @param arrayToSplice
   */
  var join = function() {
    var fullPath = null;
    var pathParts = _.toArray(arguments);
//    console.log('arguments', arguments);
//    console.log('pathParts', pathParts);

    if (pathParts) {
      if (pathParts.length === 1) {
        //return the sent path
        fullPath = pathParts[0];

      } else if (pathParts.length > 1) {
        var trimmedParts = [];

        //remove the first part of the path and trim the right side only
        trimmedParts.push(_.str.rtrim(pathParts.shift(), PATH_CHARS));

        //remove the last part of the path and trim the left side only
        var lastPart = _.str.ltrim(pathParts.pop(), PATH_CHARS);

        //for each other the other parts trim both sides
        _.each(pathParts, function(pathPart) {
          trimmedParts.push(_.str.trim(pathPart, PATH_CHARS));
        });

        trimmedParts.push(lastPart);

        fullPath = trimmedParts.join('/');
      }
    }

    return fullPath;
  };

  var path = {
    join: join
  };

  wilson.utils.path = path;
  wilson.utils.decodeURL = decodeURL;
})(angular.wilson, _);