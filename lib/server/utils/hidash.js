var _ = require('lodash');


function mergeAll() {
  var argsArray = _.toArray(arguments);
  argsArray.push(function(a, b) {
    return _.isArray(a) ? _.union(a, b) : undefined;
  });

  return _.merge.apply(null, argsArray);
}

var hidash = {
  mergeAll: mergeAll
};


module.exports = hidash;
