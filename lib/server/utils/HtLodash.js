/**
 * Created by hunter.novak on 3/3/16.
 */
var _       = require('lodash'),
    ustring = require('underscore.string'),
    sprintf = require('sprintf-js').sprintf;


/******** Custom Additional Methods ********/

function mergeAll() {
  var argsArray = _.toArray(arguments);
  argsArray.push(function(a, b) {
    return _.isArray(a) ? _.union(a, b) : undefined;
  });

  return _.mergeWith.apply(null, argsArray);
}


/******** Decorate Lodash ********/

_.mergeAll      = mergeAll;
_.sprintf       = sprintf;
_.strRight      = ustring.strRight;
_.strRightBack  = ustring.strRightBack;


module.exports = _;