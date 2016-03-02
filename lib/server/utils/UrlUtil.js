var _       = require('lodash'),
    ustring = require('underscore.string');


// Decorate required functions
_.strRightBack = ustring.strRightBack;

var PATH_CHARS = ' /';

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
      trimmedParts.push(_.trimEnd(pathParts.shift(), PATH_CHARS));

      //remove the last part of the path and trim the left side only
      var lastPart = _.trimStart(pathParts.pop(), PATH_CHARS);

      //for each other the other parts trim both sides
      _.each(pathParts, function(pathPart) {
        trimmedParts.push(_.trim(pathPart, PATH_CHARS));
      });

      trimmedParts.push(lastPart);

      fullPath = trimmedParts.join('/');
    }
  }

  return fullPath;
};

/**
 * Returns a search (GET var) string based on the @jsonObject
 *
 * ex: { myParam: 'something', myOtherParam: 'somethingElse' } => myParam=something&myOtherParam=somethingElse
 *
 *
 * @param jsonObject
 * @returns {string}
 */
var jsonToSearchParameterString = function(jsonObject) {
  var getParams = [];


  function _jsonToSearchParameterString(_jsonObject, prefix) {
    //loop over all keys in the object
    _.each(_jsonObject, function(value, key) {
      if (_.isObject(value)) {
        //if the value is an object recurse
        _jsonToSearchParameterString(value, key + '.');
      } else {
        //if the value is not an object then add it to the GET params
        getParams.push(_.sprintf('%s=%s', prefix + key, encodeURIComponent(value)));
      }
    });
  }

  _jsonToSearchParameterString(jsonObject, '');

  return getParams.join('&');
};

var pathToUrl = function(path) {
  return path.replace(/[\/\\]/g, '/');
};

/**
 * Given a host domain returns the base domain
 *
 * examples
 * https://host.com  => host.com
 * sub.domain.host.com => host.com
 * host.com/ => host.com
 *
 * @param hostdomain
 * @returns {*}
 */
var basedomain = function(hostdomain) {
  //_.last(req.host.replace(/:[0-9]+/, '').split('.'), 2).join('.')
  var base = hostdomain;

  //Remove trailing /
  base = _.trimEnd(base, ' /');

  //Remove protocol
  if (_.includes(base, '/')) {
    base = _.strRightBack(base, '/');
  }

  //get only the last 2 parts of the domain
  var urlParts = base.split('.');
  urlParts = urlParts.slice(Math.max(urlParts.length - 2, 1));

  //join the parts
  base = urlParts.join('.');

  return base;
};

/**
 * Converts a path to a URL
 */
module.exports = {
  join: join,
  jsonToSearchParameterString: jsonToSearchParameterString,
  pathToUrl: pathToUrl,
  basedomain: basedomain
};